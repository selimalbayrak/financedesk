-- Migration: Add Stocks and Stock Movements tables

CREATE TABLE IF NOT EXISTS public.stocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  category text,
  unit text DEFAULT 'Adet',
  unit_price bigint DEFAULT 0, -- stored in kuruş
  quantity_on_hand numeric DEFAULT 0,
  min_stock_level numeric DEFAULT 0,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  stock_id uuid NOT NULL REFERENCES public.stocks(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (movement_type IN ('in', 'out')),
  quantity numeric NOT NULL DEFAULT 1,
  unit_price bigint DEFAULT 0, -- stored in kuruş
  total_amount bigint DEFAULT 0, -- stored in kuruş
  movement_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Policies for stocks
CREATE POLICY "Enable read access for authenticated users" ON public.stocks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON public.stocks
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON public.stocks
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON public.stocks
  FOR DELETE TO authenticated USING (true);

-- Policies for stock_movements
CREATE POLICY "Enable read access for authenticated users" ON public.stock_movements
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON public.stock_movements
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON public.stock_movements
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON public.stock_movements
  FOR DELETE TO authenticated USING (true);
