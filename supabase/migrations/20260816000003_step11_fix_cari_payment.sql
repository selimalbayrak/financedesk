-- Migration: step11_fix_cari_payment

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
  VALUES (p_company_id, p_date, p_description, (CASE WHEN p_direction = 'COLLECTION' THEN 'COLLECTION' ELSE 'PAYMENT' END)::public.journal_entry_type, v_receipt_no)
  RETURNING id INTO v_je_id;

  IF p_direction = 'COLLECTION' THEN
    -- Müşteriden Para Aldık: Kasa BORÇ, Cari ALACAK
    INSERT INTO public.journal_entry_lines (journal_entry_id, chart_of_account_id, debit, credit) VALUES (v_je_id, p_safe_bank_account_id, p_amount, 0);
    INSERT INTO public.journal_entry_lines (journal_entry_id, chart_of_account_id, debit, credit) VALUES (v_je_id, p_cari_account_id, 0, p_amount);
  ELSIF p_direction = 'PAYMENT' THEN
    -- Tedarikçiye Para Ödedik: Cari BORÇ, Kasa ALACAK
    INSERT INTO public.journal_entry_lines (journal_entry_id, chart_of_account_id, debit, credit) VALUES (v_je_id, p_cari_account_id, p_amount, 0);
    INSERT INTO public.journal_entry_lines (journal_entry_id, chart_of_account_id, debit, credit) VALUES (v_je_id, p_safe_bank_account_id, 0, p_amount);
  ELSE
    RAISE EXCEPTION 'Geçersiz işlem yönü (COLLECTION veya PAYMENT olmalıdır).';
  END IF;

  RETURN v_je_id;
END;
$$;
