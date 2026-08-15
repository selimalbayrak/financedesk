-- Drop views first to avoid dependency issues
DROP VIEW IF EXISTS "public"."safe_balances";
DROP VIEW IF EXISTS "public"."account_balances";

CREATE OR REPLACE VIEW "public"."account_balances" AS
SELECT
  a.id,
  a.user_id,
  a.company_id,
  a.name,
  a.company_name,
  a.tax_number,
  a.tax_office,
  a.phone,
  a.email,
  a.city,
  a.district,
  a.type,
  a.created_at,
  a.chart_of_account_id,
  COALESCE(SUM(CASE WHEN t.transaction_type IN ('invoice_out', 'payment_out') THEN t.amount ELSE 0 END), 0) AS positive_total,
  COALESCE(SUM(CASE WHEN t.transaction_type IN ('invoice_in', 'payment_in') THEN t.amount ELSE 0 END), 0) AS negative_total,
  COALESCE(SUM(CASE WHEN t.transaction_type IN ('invoice_out', 'payment_out') THEN t.amount ELSE 0 END), 0) -
  COALESCE(SUM(CASE WHEN t.transaction_type IN ('invoice_in', 'payment_in') THEN t.amount ELSE 0 END), 0) AS balance
FROM
  "public"."accounts" a
LEFT JOIN
  "public"."transactions" t ON a.id = t.account_id AND t.deleted_at IS NULL
WHERE
  a.deleted_at IS NULL
GROUP BY
  a.id, a.user_id, a.company_id, a.name, a.company_name, a.tax_number, a.tax_office, a.phone, a.email, a.city, a.district, a.type, a.created_at, a.chart_of_account_id;

CREATE OR REPLACE VIEW "public"."safe_balances" AS
SELECT
  s.id,
  s.company_id,
  s.name,
  s.chart_of_account_id,
  COALESCE(SUM(
    CASE 
      WHEN t.transaction_type = 'payment_in' THEN t.amount 
      WHEN t.transaction_type = 'safe_transfer' AND t.to_safe_id = s.id THEN t.amount
      ELSE 0 
    END
  ), 0) AS total_in,
  
  COALESCE(SUM(
    CASE 
      WHEN t.transaction_type = 'payment_out' THEN t.amount 
      WHEN t.transaction_type = 'safe_transfer' AND t.safe_id = s.id THEN t.amount
      ELSE 0 
    END
  ), 0) AS total_out,

  COALESCE(SUM(
    CASE 
      WHEN t.transaction_type = 'payment_in' THEN t.amount 
      WHEN t.transaction_type = 'safe_transfer' AND t.to_safe_id = s.id THEN t.amount
      ELSE 0 
    END
  ), 0) -
  COALESCE(SUM(
    CASE 
      WHEN t.transaction_type = 'payment_out' THEN t.amount 
      WHEN t.transaction_type = 'safe_transfer' AND t.safe_id = s.id THEN t.amount
      ELSE 0 
    END
  ), 0) AS balance
FROM
  "public"."safes" s
LEFT JOIN
  "public"."transactions" t ON (s.id = t.safe_id OR s.id = t.to_safe_id) AND t.deleted_at IS NULL
WHERE
  s.deleted_at IS NULL
GROUP BY
  s.id, s.company_id, s.name, s.chart_of_account_id;

-- Update get_trial_balance to include accounts with 0 balance
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
  account_tree AS (
    SELECT 
      c.id as account_id,
      c.id as root_account_id,
      COALESCE(rb.debit, 0) as debit,
      COALESCE(rb.credit, 0) as credit
    FROM public.chart_of_accounts c
    LEFT JOIN raw_balances rb ON c.id = rb.account_id
    WHERE c.company_id = p_company_id
    
    UNION ALL
    
    SELECT 
      c.parent_id as account_id,
      at.root_account_id,
      at.debit,
      at.credit
    FROM public.chart_of_accounts c
    JOIN account_tree at ON c.id = at.account_id
    WHERE c.parent_id IS NOT NULL
  ),
  rolled_up AS (
    SELECT 
      at.account_id,
      SUM(at.debit) as total_debit,
      SUM(at.credit) as total_credit
    FROM account_tree at
    GROUP BY at.account_id
  )
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
  ORDER BY c.code ASC;
END;
$$;
