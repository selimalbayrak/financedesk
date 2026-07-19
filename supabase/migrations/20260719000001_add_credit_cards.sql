CREATE TABLE IF NOT EXISTS public.credit_cards (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    card_name text NOT NULL,
    card_type text NOT NULL CHECK (card_type IN ('personal', 'company')), -- personal=bireysel, company=şirket
    bank_name text NOT NULL,
    limit_amount bigint NOT NULL, -- in cents
    current_debt bigint DEFAULT 0 NOT NULL, -- in cents
    cutoff_day integer NOT NULL CHECK (cutoff_day BETWEEN 1 AND 31),
    due_day integer NOT NULL CHECK (due_day BETWEEN 1 AND 31),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.credit_card_transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    card_id uuid NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
    transaction_date date NOT NULL,
    description text NOT NULL,
    amount bigint NOT NULL, -- positive is purchase/spending, negative is payment/refund
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_card_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON public.credit_cards
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON public.credit_cards
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON public.credit_cards
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON public.credit_cards
    FOR DELETE TO authenticated USING (true);

CREATE POLICY "Enable read access for authenticated users" ON public.credit_card_transactions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON public.credit_card_transactions
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON public.credit_card_transactions
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON public.credit_card_transactions
    FOR DELETE TO authenticated USING (true);
