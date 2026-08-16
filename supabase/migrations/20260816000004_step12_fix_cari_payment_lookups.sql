-- Migration: step12_fix_cari_payment_lookups

CREATE OR REPLACE FUNCTION public.process_cari_payment(
  p_company_id uuid,
  p_cari_account_id uuid, -- accounts tablosundaki id
  p_safe_bank_account_id uuid, -- safes tablosundaki id
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
  v_cari_coa_id uuid;
  v_safe_coa_id uuid;
BEGIN
  -- Look up chart_of_account_id for cari (accounts)
  SELECT chart_of_account_id INTO v_cari_coa_id FROM public.accounts WHERE id = p_cari_account_id;
  IF v_cari_coa_id IS NULL THEN
    RAISE EXCEPTION 'Cari hesap (chart_of_account_id) bulunamadı.';
  END IF;

  -- Look up chart_of_account_id for safe (safes)
  SELECT chart_of_account_id INTO v_safe_coa_id FROM public.safes WHERE id = p_safe_bank_account_id;
  IF v_safe_coa_id IS NULL THEN
    RAISE EXCEPTION 'Kasa/Banka hesabı (chart_of_account_id) bulunamadı.';
  END IF;

  v_receipt_no := 'CARI-' || to_char(p_date, 'YYYYMMDD') || '-' || substring(md5(random()::text) from 1 for 4);

  INSERT INTO public.journal_entries (company_id, date, description, type, receipt_no)
  VALUES (p_company_id, p_date, p_description, (CASE WHEN p_direction = 'COLLECTION' THEN 'COLLECTION' ELSE 'PAYMENT' END)::public.journal_entry_type, v_receipt_no)
  RETURNING id INTO v_je_id;

  IF p_direction = 'COLLECTION' THEN
    -- Müşteriden Para Aldık: Kasa BORÇ, Cari ALACAK
    INSERT INTO public.journal_entry_lines (journal_entry_id, chart_of_account_id, debit, credit) VALUES (v_je_id, v_safe_coa_id, p_amount, 0);
    INSERT INTO public.journal_entry_lines (journal_entry_id, chart_of_account_id, debit, credit) VALUES (v_je_id, v_cari_coa_id, 0, p_amount);
  ELSIF p_direction = 'PAYMENT' THEN
    -- Tedarikçiye Para Ödedik: Cari BORÇ, Kasa ALACAK
    INSERT INTO public.journal_entry_lines (journal_entry_id, chart_of_account_id, debit, credit) VALUES (v_je_id, v_cari_coa_id, p_amount, 0);
    INSERT INTO public.journal_entry_lines (journal_entry_id, chart_of_account_id, debit, credit) VALUES (v_je_id, v_safe_coa_id, 0, p_amount);
  ELSE
    RAISE EXCEPTION 'Geçersiz işlem yönü (COLLECTION veya PAYMENT olmalıdır).';
  END IF;

  RETURN v_je_id;
END;
$$;
