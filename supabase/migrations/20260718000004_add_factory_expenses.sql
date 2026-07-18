CREATE TABLE IF NOT EXISTS public.factory_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  expense_type text NOT NULL, -- 'Rent', 'Electricity', 'Water', 'Gas', 'Internet', 'Other'
  amount integer NOT NULL, -- in cents
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid', 'unpaid')),
  paid_date date,
  safe_id uuid REFERENCES public.safes(id) ON DELETE SET NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.factory_expenses ENABLE ROW LEVEL SECURITY;

-- Add RLS policy using our secure non-recursive function
DROP POLICY IF EXISTS "Users can manage factory_expenses in their companies" ON public.factory_expenses;
CREATE POLICY "Users can manage factory_expenses in their companies" ON public.factory_expenses FOR ALL TO authenticated
USING (public.check_user_belongs_to_company(company_id, auth.uid()))
WITH CHECK (public.check_user_belongs_to_company(company_id, auth.uid()));
