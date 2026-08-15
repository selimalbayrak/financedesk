-- 1. Hiyerarşik Mizan (Trial Balance) Hesaplama RPC Fonksiyonu
CREATE OR REPLACE FUNCTION public.get_trial_balance(
  p_company_id uuid,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  code text,
  name text,
  type text,
  parent_id uuid,
  total_debit numeric,
  total_credit numeric,
  debit_balance numeric,
  credit_balance numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE
  -- Adım 1: Sadece seçili tarih aralığındaki ve şirkete ait ham hareket (DETAIL) bakiyelerini bul
  raw_balances AS (
    SELECT 
      jel.chart_of_account_id as account_id,
      SUM(jel.debit) as debit,
      SUM(jel.credit) as credit
    FROM public.journal_entry_lines jel
    JOIN public.journal_entries je ON jel.journal_entry_id = je.id
    WHERE je.company_id = p_company_id
      AND (p_start_date IS NULL OR je.date >= p_start_date)
      AND (p_end_date IS NULL OR je.date <= p_end_date)
    GROUP BY jel.chart_of_account_id
  ),
  -- Adım 2: Hiyerarşik olarak bakiyeleri üst hesaplara doğru (aşağıdan yukarıya) yuvarla
  account_tree AS (
    -- Temel Durum: Hesapların kendi bakiyeleri
    SELECT 
      c.id as account_id,
      c.id as root_account_id,
      COALESCE(rb.debit, 0) as debit,
      COALESCE(rb.credit, 0) as credit
    FROM public.chart_of_accounts c
    LEFT JOIN raw_balances rb ON c.id = rb.account_id
    WHERE c.company_id = p_company_id
    
    UNION ALL
    
    -- Özyineli (Recursive) Durum: Alt hesapların bakiyelerini üst hesaplara aktar
    SELECT 
      c.parent_id as account_id,
      at.root_account_id,
      at.debit,
      at.credit
    FROM public.chart_of_accounts c
    JOIN account_tree at ON c.id = at.account_id
    WHERE c.parent_id IS NOT NULL
  ),
  -- Adım 3: Aynı account_id için yuvarlanmış değerleri topla
  rolled_up AS (
    SELECT 
      at.account_id,
      SUM(at.debit) as total_debit,
      SUM(at.credit) as total_credit
    FROM account_tree at
    GROUP BY at.account_id
  )
  -- Adım 4: Nihai Mizan Listesini Oluştur ve Bakiye (Balance) Hesapla
  SELECT 
    c.id,
    c.code,
    c.name,
    c.type::text,
    c.parent_id,
    COALESCE(ru.total_debit, 0) as total_debit,
    COALESCE(ru.total_credit, 0) as total_credit,
    CASE 
      WHEN COALESCE(ru.total_debit, 0) > COALESCE(ru.total_credit, 0) 
      THEN COALESCE(ru.total_debit, 0) - COALESCE(ru.total_credit, 0) 
      ELSE 0 
    END as debit_balance,
    CASE 
      WHEN COALESCE(ru.total_credit, 0) > COALESCE(ru.total_debit, 0) 
      THEN COALESCE(ru.total_credit, 0) - COALESCE(ru.total_debit, 0) 
      ELSE 0 
    END as credit_balance
  FROM public.chart_of_accounts c
  LEFT JOIN rolled_up ru ON c.id = ru.account_id
  WHERE c.company_id = p_company_id
    -- Sadece işlem görmüş veya bakiyesi olan hesapları getir
    AND (ru.total_debit > 0 OR ru.total_credit > 0)
  ORDER BY c.code ASC;
END;
$$;


-- 2. Muavin Defter (Account Ledger) ve Devir Bakiyesi RPC Fonksiyonu
CREATE OR REPLACE FUNCTION public.get_account_ledger(
  p_company_id uuid,
  p_account_id uuid,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  is_opening boolean,
  entry_id uuid,
  entry_date date,
  receipt_no text,
  description text,
  debit numeric,
  credit numeric,
  running_balance numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_opening_debit numeric := 0;
  v_opening_credit numeric := 0;
  v_opening_balance numeric := 0;
BEGIN
  -- Adım 1: Devir (Açılış) Bakiyesini Hesapla (Eğer start_date verilmişse)
  IF p_start_date IS NOT NULL THEN
    SELECT 
      COALESCE(SUM(jel.debit), 0), 
      COALESCE(SUM(jel.credit), 0)
    INTO v_opening_debit, v_opening_credit
    FROM public.journal_entry_lines jel
    JOIN public.journal_entries je ON jel.journal_entry_id = je.id
    WHERE je.company_id = p_company_id
      AND jel.chart_of_account_id = p_account_id
      AND je.date < p_start_date;
      
    v_opening_balance := v_opening_debit - v_opening_credit;

    -- Açılış Satırını Döndür
    RETURN QUERY 
    SELECT 
      true as is_opening,
      NULL::uuid as entry_id,
      p_start_date as entry_date,
      ''::text as receipt_no,
      'Açılış / Devir Bakiyesi'::text as description,
      CASE WHEN v_opening_balance > 0 THEN v_opening_balance ELSE 0 END as debit,
      CASE WHEN v_opening_balance < 0 THEN ABS(v_opening_balance) ELSE 0 END as credit,
      v_opening_balance as running_balance;
  END IF;

  -- Adım 2: Belirtilen Tarihler Arasındaki Gerçek Fiş Hareketlerini Listele ve Bakiye Yürüt
  RETURN QUERY
  WITH lines AS (
    SELECT 
      false as is_opening,
      je.id as entry_id,
      je.date as entry_date,
      je.receipt_no as receipt_no,
      je.description as description,
      jel.debit,
      jel.credit,
      je.created_at
    FROM public.journal_entry_lines jel
    JOIN public.journal_entries je ON jel.journal_entry_id = je.id
    WHERE je.company_id = p_company_id
      AND jel.chart_of_account_id = p_account_id
      AND (p_start_date IS NULL OR je.date >= p_start_date)
      AND (p_end_date IS NULL OR je.date <= p_end_date)
  )
  SELECT 
    l.is_opening,
    l.entry_id,
    l.entry_date,
    l.receipt_no,
    l.description,
    l.debit,
    l.credit,
    v_opening_balance + SUM(l.debit - l.credit) OVER (ORDER BY l.entry_date, l.created_at) as running_balance
  FROM lines l
  ORDER BY l.entry_date, l.created_at;
END;
$$;


-- 3. Yeni Şirket Kurulduğunda Otomatik Tekdüzen (Seed) Trigger'ı
CREATE OR REPLACE FUNCTION public.seed_default_chart_of_accounts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_1 uuid; v_10 uuid; v_100 uuid; v_102 uuid;
  v_12 uuid; v_120 uuid;
  v_15 uuid; v_150 uuid; v_152 uuid; v_153 uuid;
  v_3 uuid; v_32 uuid; v_320 uuid;
  v_6 uuid; v_60 uuid; v_600 uuid;
BEGIN
  -- 1 DÖNEN VARLIKLAR
  INSERT INTO public.chart_of_accounts (company_id, code, name, type) VALUES (NEW.id, '1', 'DÖNEN VARLIKLAR', 'MAIN') RETURNING id INTO v_1;
    
    -- 10 HAZIR DEĞERLER
    INSERT INTO public.chart_of_accounts (company_id, code, name, type, parent_id) VALUES (NEW.id, '10', 'HAZIR DEĞERLER', 'MAIN', v_1) RETURNING id INTO v_10;
      INSERT INTO public.chart_of_accounts (company_id, code, name, type, parent_id) VALUES (NEW.id, '100', 'KASA', 'SUB', v_10) RETURNING id INTO v_100;
      INSERT INTO public.chart_of_accounts (company_id, code, name, type, parent_id) VALUES (NEW.id, '102', 'BANKALAR', 'SUB', v_10) RETURNING id INTO v_102;
    
    -- 12 TİCARİ ALACAKLAR
    INSERT INTO public.chart_of_accounts (company_id, code, name, type, parent_id) VALUES (NEW.id, '12', 'TİCARİ ALACAKLAR', 'MAIN', v_1) RETURNING id INTO v_12;
      INSERT INTO public.chart_of_accounts (company_id, code, name, type, parent_id) VALUES (NEW.id, '120', 'ALICILAR', 'SUB', v_12) RETURNING id INTO v_120;
    
    -- 15 STOKLAR
    INSERT INTO public.chart_of_accounts (company_id, code, name, type, parent_id) VALUES (NEW.id, '15', 'STOKLAR', 'MAIN', v_1) RETURNING id INTO v_15;
      INSERT INTO public.chart_of_accounts (company_id, code, name, type, parent_id) VALUES (NEW.id, '150', 'İLK MADDE VE MALZEME', 'SUB', v_15) RETURNING id INTO v_150;
      INSERT INTO public.chart_of_accounts (company_id, code, name, type, parent_id) VALUES (NEW.id, '152', 'MAMULLER', 'SUB', v_15) RETURNING id INTO v_152;
      INSERT INTO public.chart_of_accounts (company_id, code, name, type, parent_id) VALUES (NEW.id, '153', 'TİCARİ MALLAR', 'SUB', v_15) RETURNING id INTO v_153;

  -- 3 KISA VADELİ YABANCI KAYNAKLAR
  INSERT INTO public.chart_of_accounts (company_id, code, name, type) VALUES (NEW.id, '3', 'KISA VADELİ YABANCI KAYNAKLAR', 'MAIN') RETURNING id INTO v_3;
    
    -- 32 TİCARİ BORÇLAR
    INSERT INTO public.chart_of_accounts (company_id, code, name, type, parent_id) VALUES (NEW.id, '32', 'TİCARİ BORÇLAR', 'MAIN', v_3) RETURNING id INTO v_32;
      INSERT INTO public.chart_of_accounts (company_id, code, name, type, parent_id) VALUES (NEW.id, '320', 'SATICILAR', 'SUB', v_32) RETURNING id INTO v_320;

  -- 6 GELİR TABLOSU HESAPLARI
  INSERT INTO public.chart_of_accounts (company_id, code, name, type) VALUES (NEW.id, '6', 'GELİR TABLOSU HESAPLARI', 'MAIN') RETURNING id INTO v_6;
    
    -- 60 BRÜT SATIŞLAR
    INSERT INTO public.chart_of_accounts (company_id, code, name, type, parent_id) VALUES (NEW.id, '60', 'BRÜT SATIŞLAR', 'MAIN', v_6) RETURNING id INTO v_60;
      INSERT INTO public.chart_of_accounts (company_id, code, name, type, parent_id) VALUES (NEW.id, '600', 'YURTİÇİ SATIŞLAR', 'SUB', v_60) RETURNING id INTO v_600;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_chart_of_accounts ON public.companies;
CREATE TRIGGER trg_seed_chart_of_accounts
AFTER INSERT ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.seed_default_chart_of_accounts();
