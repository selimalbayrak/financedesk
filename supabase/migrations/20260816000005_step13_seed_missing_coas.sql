-- Migration: step13_seed_missing_coas

DO $$
DECLARE
  v_rec record;
  v_coa_id uuid;
  v_name_to_use text;
  v_new_code text;
  v_parent_id uuid;
BEGIN
  -- 1. Safes (100) and Banks (102) missing chart_of_account_id
  FOR v_rec IN SELECT * FROM public.safes WHERE chart_of_account_id IS NULL LOOP
    IF v_rec.name ILIKE '%bank%' OR v_rec.name ILIKE '%banka%' THEN
      v_new_code := public.generate_next_account_code(v_rec.company_id, '102');
      SELECT id INTO v_parent_id FROM public.chart_of_accounts WHERE company_id = v_rec.company_id AND code = '102' LIMIT 1;
    ELSE
      v_new_code := public.generate_next_account_code(v_rec.company_id, '100');
      SELECT id INTO v_parent_id FROM public.chart_of_accounts WHERE company_id = v_rec.company_id AND code = '100' LIMIT 1;
    END IF;

    INSERT INTO public.chart_of_accounts (company_id, code, name, type, parent_id)
    VALUES (v_rec.company_id, v_new_code, v_rec.name, 'DETAIL', v_parent_id)
    RETURNING id INTO v_coa_id;

    UPDATE public.safes SET chart_of_account_id = v_coa_id WHERE id = v_rec.id;
  END LOOP;
  
  -- 2. Accounts (120/320) missing chart_of_account_id
  FOR v_rec IN SELECT * FROM public.accounts WHERE chart_of_account_id IS NULL LOOP
    v_name_to_use := COALESCE(v_rec.company_name, v_rec.name, 'Bilinmeyen Cari');
    IF v_rec.type = 'customer' THEN
      v_new_code := public.generate_next_account_code(v_rec.company_id, '120');
      SELECT id INTO v_parent_id FROM public.chart_of_accounts WHERE company_id = v_rec.company_id AND code = '120' LIMIT 1;
    ELSIF v_rec.type = 'supplier' THEN
      v_new_code := public.generate_next_account_code(v_rec.company_id, '320');
      SELECT id INTO v_parent_id FROM public.chart_of_accounts WHERE company_id = v_rec.company_id AND code = '320' LIMIT 1;
    ELSE
      v_new_code := public.generate_next_account_code(v_rec.company_id, '120');
      SELECT id INTO v_parent_id FROM public.chart_of_accounts WHERE company_id = v_rec.company_id AND code = '120' LIMIT 1;
    END IF;

    INSERT INTO public.chart_of_accounts (company_id, code, name, type, parent_id)
    VALUES (v_rec.company_id, v_new_code, v_name_to_use, 'DETAIL', v_parent_id)
    RETURNING id INTO v_coa_id;

    UPDATE public.accounts SET chart_of_account_id = v_coa_id WHERE id = v_rec.id;
  END LOOP;
END;
$$;
