-- Migration: step13_seed_missing_coas

DO $$
DECLARE
  v_rec record;
  v_coa_id uuid;
  v_name_to_use text;
BEGIN
  -- 1. Safes (100) and Banks (102) missing chart_of_account_id
  FOR v_rec IN SELECT * FROM public.safes WHERE chart_of_account_id IS NULL LOOP
    IF v_rec.name ILIKE '%bank%' OR v_rec.name ILIKE '%banka%' THEN
      v_coa_id := public.create_sub_account(v_rec.company_id, '102', v_rec.name);
    ELSE
      v_coa_id := public.create_sub_account(v_rec.company_id, '100', v_rec.name);
    END IF;
    UPDATE public.safes SET chart_of_account_id = v_coa_id WHERE id = v_rec.id;
  END LOOP;
  
  -- 2. Accounts (120/320) missing chart_of_account_id
  FOR v_rec IN SELECT * FROM public.accounts WHERE chart_of_account_id IS NULL LOOP
    v_name_to_use := COALESCE(v_rec.company_name, v_rec.name, 'Bilinmeyen Cari');
    IF v_rec.type = 'customer' THEN
      v_coa_id := public.create_sub_account(v_rec.company_id, '120', v_name_to_use);
    ELSIF v_rec.type = 'supplier' THEN
      v_coa_id := public.create_sub_account(v_rec.company_id, '320', v_name_to_use);
    ELSE
      v_coa_id := public.create_sub_account(v_rec.company_id, '120', v_name_to_use);
    END IF;
    UPDATE public.accounts SET chart_of_account_id = v_coa_id WHERE id = v_rec.id;
  END LOOP;
END;
$$;
