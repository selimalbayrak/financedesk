-- 1. Güncellenmiş Şirket Kurulum (Seed) Trigger'ı (335 ve 770 eklendi)
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
  v_33 uuid; v_335 uuid;
  v_6 uuid; v_60 uuid; v_600 uuid;
  v_7 uuid; v_770 uuid;
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
    -- 33 PERSONEL BORÇLARI
    INSERT INTO public.chart_of_accounts (company_id, code, name, type, parent_id) VALUES (NEW.id, '33', 'PERSONEL BORÇLARI', 'MAIN', v_3) RETURNING id INTO v_33;
      INSERT INTO public.chart_of_accounts (company_id, code, name, type, parent_id) VALUES (NEW.id, '335', 'PERSONELE BORÇLAR', 'SUB', v_33) RETURNING id INTO v_335;

  -- 6 GELİR TABLOSU HESAPLARI
  INSERT INTO public.chart_of_accounts (company_id, code, name, type) VALUES (NEW.id, '6', 'GELİR TABLOSU HESAPLARI', 'MAIN') RETURNING id INTO v_6;
    -- 60 BRÜT SATIŞLAR
    INSERT INTO public.chart_of_accounts (company_id, code, name, type, parent_id) VALUES (NEW.id, '60', 'BRÜT SATIŞLAR', 'MAIN', v_6) RETURNING id INTO v_60;
      INSERT INTO public.chart_of_accounts (company_id, code, name, type, parent_id) VALUES (NEW.id, '600', 'YURTİÇİ SATIŞLAR', 'SUB', v_60) RETURNING id INTO v_600;

  -- 7 MALİYET HESAPLARI
  INSERT INTO public.chart_of_accounts (company_id, code, name, type) VALUES (NEW.id, '7', 'MALİYET HESAPLARI', 'MAIN') RETURNING id INTO v_7;
    INSERT INTO public.chart_of_accounts (company_id, code, name, type, parent_id) VALUES (NEW.id, '770', 'GENEL YÖNETİM GİDERLERİ', 'SUB', v_7) RETURNING id INTO v_770;

  RETURN NEW;
END;
$$;


-- 2. Gider (Expense) RPC: process_expense_payment
CREATE OR REPLACE FUNCTION public.process_expense_payment(
  p_company_id uuid,
  p_expense_type text, -- Örn: "Kira", "Elektrik"
  p_amount numeric,
  p_safe_bank_account_id uuid,
  p_date date,
  p_description text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_770_id uuid;
  v_expense_account_id uuid;
  v_new_code text;
  v_je_id uuid;
  v_receipt_no text;
BEGIN
  -- A. 770 ana hesabını bul
  SELECT id INTO v_770_id FROM public.chart_of_accounts 
  WHERE company_id = p_company_id AND code = '770' LIMIT 1;
  
  IF v_770_id IS NULL THEN
    RAISE EXCEPTION '770 Genel Yönetim Giderleri hesabı bulunamadı.';
  END IF;

  -- B. Dinamik Alt Hesap Kontrolü (Gider Türüne Göre)
  SELECT id INTO v_expense_account_id FROM public.chart_of_accounts
  WHERE company_id = p_company_id AND parent_id = v_770_id AND name = p_expense_type LIMIT 1;

  IF v_expense_account_id IS NULL THEN
    -- Yeni alt hesap oluştur
    SELECT '770.' || LPAD((COUNT(*) + 1)::text, 2, '0') INTO v_new_code
    FROM public.chart_of_accounts WHERE parent_id = v_770_id;

    INSERT INTO public.chart_of_accounts (company_id, code, name, type, parent_id)
    VALUES (p_company_id, v_new_code, p_expense_type, 'DETAIL', v_770_id)
    RETURNING id INTO v_expense_account_id;
  END IF;

  -- C. Evrak No Oluştur
  v_receipt_no := 'GDR-' || to_char(p_date, 'YYYYMMDD') || '-' || substring(md5(random()::text) from 1 for 4);

  -- D. Yevmiye Başlığı
  INSERT INTO public.journal_entries (company_id, date, description, type, receipt_no)
  VALUES (p_company_id, p_date, p_description, 'Gider Ödemesi', v_receipt_no)
  RETURNING id INTO v_je_id;

  -- E. Yevmiye Satırları
  -- 770 Alt Hesabı BORÇ
  INSERT INTO public.journal_entry_lines (journal_entry_id, chart_of_account_id, debit, credit, description)
  VALUES (v_je_id, v_expense_account_id, p_amount, 0, p_description);

  -- Kasa/Banka ALACAK
  INSERT INTO public.journal_entry_lines (journal_entry_id, chart_of_account_id, debit, credit, description)
  VALUES (v_je_id, p_safe_bank_account_id, 0, p_amount, p_description);

  RETURN v_je_id;
END;
$$;


-- 3. Personel (Employee) RPC: process_personnel_transaction
CREATE OR REPLACE FUNCTION public.process_personnel_transaction(
  p_company_id uuid,
  p_employee_name text,
  p_amount numeric,
  p_safe_bank_account_id uuid, -- Sadece PAYMENT için gerekli, ACCRUAL'da NULL olabilir
  p_date date,
  p_description text,
  p_type text -- 'ACCRUAL' (Tahakkuk) veya 'PAYMENT' (Ödeme)
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_335_id uuid;
  v_employee_account_id uuid;
  v_770_id uuid;
  v_salary_expense_id uuid;
  v_new_code text;
  v_je_id uuid;
  v_receipt_no text;
BEGIN
  -- A. 335 ana hesabını bul
  SELECT id INTO v_335_id FROM public.chart_of_accounts 
  WHERE company_id = p_company_id AND code = '335' LIMIT 1;
  
  IF v_335_id IS NULL THEN
    RAISE EXCEPTION '335 Personele Borçlar hesabı bulunamadı.';
  END IF;

  -- Personel için dinamik alt hesap kontrolü (Örn: 335.01 Ahmet Yılmaz)
  SELECT id INTO v_employee_account_id FROM public.chart_of_accounts
  WHERE company_id = p_company_id AND parent_id = v_335_id AND name = p_employee_name LIMIT 1;

  IF v_employee_account_id IS NULL THEN
    SELECT '335.' || LPAD((COUNT(*) + 1)::text, 2, '0') INTO v_new_code
    FROM public.chart_of_accounts WHERE parent_id = v_335_id;

    INSERT INTO public.chart_of_accounts (company_id, code, name, type, parent_id)
    VALUES (p_company_id, v_new_code, p_employee_name, 'DETAIL', v_335_id)
    RETURNING id INTO v_employee_account_id;
  END IF;

  -- B. Yevmiye Başlığı
  v_receipt_no := 'PRS-' || to_char(p_date, 'YYYYMMDD') || '-' || substring(md5(random()::text) from 1 for 4);
  INSERT INTO public.journal_entries (company_id, date, description, type, receipt_no)
  VALUES (p_company_id, p_date, p_description, CASE WHEN p_type = 'ACCRUAL' THEN 'Maaş Tahakkuku' ELSE 'Maaş Ödemesi' END, v_receipt_no)
  RETURNING id INTO v_je_id;

  -- C. Yevmiye Satırları
  IF p_type = 'ACCRUAL' THEN
    -- Tahakkuk: 770 BORÇ, 335 ALACAK
    -- Önce 770 altında Maaş Giderleri hesabı var mı bul/oluştur
    SELECT id INTO v_770_id FROM public.chart_of_accounts WHERE company_id = p_company_id AND code = '770' LIMIT 1;
    SELECT id INTO v_salary_expense_id FROM public.chart_of_accounts WHERE company_id = p_company_id AND parent_id = v_770_id AND name = 'Maaş ve Ücret Giderleri' LIMIT 1;
    
    IF v_salary_expense_id IS NULL THEN
      SELECT '770.' || LPAD((COUNT(*) + 1)::text, 2, '0') INTO v_new_code FROM public.chart_of_accounts WHERE parent_id = v_770_id;
      INSERT INTO public.chart_of_accounts (company_id, code, name, type, parent_id) VALUES (p_company_id, v_new_code, 'Maaş ve Ücret Giderleri', 'DETAIL', v_770_id) RETURNING id INTO v_salary_expense_id;
    END IF;

    INSERT INTO public.journal_entry_lines (journal_entry_id, chart_of_account_id, debit, credit, description) VALUES (v_je_id, v_salary_expense_id, p_amount, 0, p_description);
    INSERT INTO public.journal_entry_lines (journal_entry_id, chart_of_account_id, debit, credit, description) VALUES (v_je_id, v_employee_account_id, 0, p_amount, p_description);

  ELSIF p_type = 'PAYMENT' THEN
    -- Ödeme: 335 BORÇ, Kasa/Banka ALACAK
    IF p_safe_bank_account_id IS NULL THEN RAISE EXCEPTION 'Ödeme işlemi için Kasa/Banka seçilmelidir.'; END IF;
    INSERT INTO public.journal_entry_lines (journal_entry_id, chart_of_account_id, debit, credit, description) VALUES (v_je_id, v_employee_account_id, p_amount, 0, p_description);
    INSERT INTO public.journal_entry_lines (journal_entry_id, chart_of_account_id, debit, credit, description) VALUES (v_je_id, p_safe_bank_account_id, 0, p_amount, p_description);
  ELSE
    RAISE EXCEPTION 'Geçersiz işlem tipi (ACCRUAL veya PAYMENT olmalıdır).';
  END IF;

  RETURN v_je_id;
END;
$$;


-- 4. Cari Tahsilat ve Ödeme RPC: process_cari_payment
CREATE OR REPLACE FUNCTION public.process_cari_payment(
  p_company_id uuid,
  p_cari_account_id uuid, -- 120 veya 320'nin alt hesabı
  p_safe_bank_account_id uuid, -- 100 veya 102
  p_amount numeric,
  p_date date,
  p_description text,
  p_direction text -- 'COLLECTION' (Tahsilat/Para Alma) veya 'PAYMENT' (Ödeme/Para Gönderme)
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_je_id uuid;
  v_receipt_no text;
BEGIN
  v_receipt_no := 'CARI-' || to_char(p_date, 'YYYYMMDD') || '-' || substring(md5(random()::text) from 1 for 4);

  INSERT INTO public.journal_entries (company_id, date, description, type, receipt_no)
  VALUES (p_company_id, p_date, p_description, CASE WHEN p_direction = 'COLLECTION' THEN 'Cari Tahsilat' ELSE 'Cari Ödeme' END, v_receipt_no)
  RETURNING id INTO v_je_id;

  IF p_direction = 'COLLECTION' THEN
    -- Müşteriden Para Aldık: Kasa BORÇ, Cari ALACAK
    INSERT INTO public.journal_entry_lines (journal_entry_id, chart_of_account_id, debit, credit, description) VALUES (v_je_id, p_safe_bank_account_id, p_amount, 0, p_description);
    INSERT INTO public.journal_entry_lines (journal_entry_id, chart_of_account_id, debit, credit, description) VALUES (v_je_id, p_cari_account_id, 0, p_amount, p_description);
  ELSIF p_direction = 'PAYMENT' THEN
    -- Tedarikçiye Para Ödedik: Cari BORÇ, Kasa ALACAK
    INSERT INTO public.journal_entry_lines (journal_entry_id, chart_of_account_id, debit, credit, description) VALUES (v_je_id, p_cari_account_id, p_amount, 0, p_description);
    INSERT INTO public.journal_entry_lines (journal_entry_id, chart_of_account_id, debit, credit, description) VALUES (v_je_id, p_safe_bank_account_id, 0, p_amount, p_description);
  ELSE
    RAISE EXCEPTION 'Geçersiz işlem yönü (COLLECTION veya PAYMENT olmalıdır).';
  END IF;

  RETURN v_je_id;
END;
$$;
