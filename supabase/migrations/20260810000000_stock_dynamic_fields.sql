CREATE TABLE IF NOT EXISTS public.stock_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  fields jsonb DEFAULT '[]'::jsonb, -- Array of objects: [{ name: "Marka", type: "text" }]
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, name)
);

-- RLS for stock_categories
ALTER TABLE public.stock_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON public.stock_categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON public.stock_categories
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON public.stock_categories
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON public.stock_categories
  FOR DELETE TO authenticated USING (true);

-- Alter stocks table
ALTER TABLE public.stocks ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.stock_categories(id) ON DELETE SET NULL;
ALTER TABLE public.stocks ADD COLUMN IF NOT EXISTS attributes jsonb DEFAULT '{}'::jsonb;
