ALTER TABLE public.factory_expenses ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false;
ALTER TABLE public.factory_expenses ADD COLUMN IF NOT EXISTS recurrence_day integer;
ALTER TABLE public.factory_expenses ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE public.factory_expenses ADD COLUMN IF NOT EXISTS months_paid integer DEFAULT 0;
ALTER TABLE public.factory_expenses ADD COLUMN IF NOT EXISTS monthly_amount integer;
ALTER TABLE public.factory_expenses ADD COLUMN IF NOT EXISTS attachment_url text;
