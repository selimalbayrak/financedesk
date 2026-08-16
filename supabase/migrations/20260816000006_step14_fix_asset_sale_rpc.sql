ALTER TABLE public.fixed_assets ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.fixed_assets ADD COLUMN IF NOT EXISTS description text;

CREATE OR REPLACE FUNCTION public.process_asset_sale(
    p_company_id uuid,
    p_asset_id uuid,
    p_sale_price numeric,
    p_target_account_id uuid,
    p_created_by uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_asset_record record;
    v_journal_id uuid;
    v_cost_price numeric;
    v_diff numeric;
    v_profit_loss_account_id uuid;
BEGIN
    SELECT * INTO v_asset_record FROM public.fixed_assets WHERE id = p_asset_id AND company_id = p_company_id AND status = 'ACTIVE';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Aktif varlık bulunamadı.';
    END IF;

    v_cost_price := v_asset_record.purchase_price;
    v_diff := p_sale_price - v_cost_price;

    INSERT INTO public.journal_entries (
        company_id, type, date, description, created_by
    ) VALUES (
        p_company_id, 'MANUAL'::public.journal_entry_type, CURRENT_DATE, v_asset_record.name || ' Satışı', p_created_by
    ) RETURNING id INTO v_journal_id;

    -- Target Account (Safe/Cari) - Debit
    INSERT INTO public.journal_entry_lines (
        journal_entry_id, chart_of_account_id, debit, credit
    ) VALUES (
        v_journal_id, p_target_account_id, p_sale_price, 0
    );

    -- Asset Account - Credit
    INSERT INTO public.journal_entry_lines (
        journal_entry_id, chart_of_account_id, debit, credit
    ) VALUES (
        v_journal_id, v_asset_record.chart_of_account_id, 0, v_cost_price
    );

    -- Profit/Loss handling
    IF v_diff > 0 THEN
        SELECT id INTO v_profit_loss_account_id FROM public.chart_of_accounts WHERE company_id = p_company_id AND code LIKE '679%' LIMIT 1;
        IF NOT FOUND THEN RAISE EXCEPTION '679 hesabı bulunamadı.'; END IF;
        
        INSERT INTO public.journal_entry_lines (
            journal_entry_id, chart_of_account_id, debit, credit
        ) VALUES (
            v_journal_id, v_profit_loss_account_id, 0, v_diff
        );
    ELSIF v_diff < 0 THEN
        SELECT id INTO v_profit_loss_account_id FROM public.chart_of_accounts WHERE company_id = p_company_id AND code LIKE '689%' LIMIT 1;
        IF NOT FOUND THEN RAISE EXCEPTION '689 hesabı bulunamadı.'; END IF;

        INSERT INTO public.journal_entry_lines (
            journal_entry_id, chart_of_account_id, debit, credit
        ) VALUES (
            v_journal_id, v_profit_loss_account_id, ABS(v_diff), 0
        );
    END IF;

    UPDATE public.fixed_assets SET status = 'SOLD' WHERE id = p_asset_id;

    RETURN v_journal_id;
END;
$$;
