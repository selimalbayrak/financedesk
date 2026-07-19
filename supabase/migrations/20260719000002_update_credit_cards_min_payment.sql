ALTER TABLE public.credit_cards 
ADD COLUMN IF NOT EXISTS min_payment_ratio integer DEFAULT 40 NOT NULL;
