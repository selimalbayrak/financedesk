-- Migration: Step 4 Transfer Logic & Warehouses

-- 1. Create Warehouses table
CREATE TABLE IF NOT EXISTS public.warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON public.warehouses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON public.warehouses
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON public.warehouses
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON public.warehouses
  FOR DELETE TO authenticated USING (true);

-- 2. Modify stock_movements for Transfers
-- Drop existing check constraint on movement_type and recreate it to include 'transfer'
ALTER TABLE public.stock_movements DROP CONSTRAINT IF EXISTS stock_movements_movement_type_check;
ALTER TABLE public.stock_movements ADD CONSTRAINT stock_movements_movement_type_check CHECK (movement_type IN ('in', 'out', 'transfer'));

-- Add warehouse columns if they don't exist
ALTER TABLE public.stock_movements 
  ADD COLUMN IF NOT EXISTS source_warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS destination_warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS account_code text;


-- 3. Create RPC for Financial Transfer (Virman)
CREATE OR REPLACE FUNCTION public.transfer_funds(
  p_company_id uuid,
  p_sender_safe_id uuid,
  p_receiver_safe_id uuid,
  p_amount numeric,
  p_notes text,
  p_created_by uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_id uuid;
BEGIN
  -- Validate
  IF p_sender_safe_id = p_receiver_safe_id THEN
    RAISE EXCEPTION 'Gönderen ve alıcı hesap aynı olamaz.';
  END IF;
  
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Transfer tutarı sıfırdan büyük olmalıdır.';
  END IF;

  -- Insert a single transaction record for double-entry (sender and receiver)
  INSERT INTO public.transactions (
    company_id,
    user_id,
    transaction_type,
    category,
    amount,
    currency,
    safe_id, -- sender
    to_safe_id, -- receiver
    notes,
    transaction_date,
    description
  ) VALUES (
    p_company_id,
    p_created_by,
    'safe_transfer',
    'Transfer',
    p_amount,
    'TRY',
    p_sender_safe_id,
    p_receiver_safe_id,
    p_notes,
    CURRENT_DATE,
    'Kasa/Banka Virman İşlemi'
  ) RETURNING id INTO v_transaction_id;

  RETURN json_build_object('success', true, 'transaction_id', v_transaction_id);
END;
$$;


-- 4. Create RPC for Stock Transfer
CREATE OR REPLACE FUNCTION public.transfer_stock(
  p_company_id uuid,
  p_stock_id uuid,
  p_source_warehouse_id uuid,
  p_destination_warehouse_id uuid,
  p_quantity numeric,
  p_notes text,
  p_created_by uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_movement_id uuid;
BEGIN
  -- Validate
  IF p_source_warehouse_id = p_destination_warehouse_id THEN
    RAISE EXCEPTION 'Çıkış ve giriş deposu aynı olamaz.';
  END IF;
  
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Transfer miktarı sıfırdan büyük olmalıdır.';
  END IF;

  -- Insert a single stock movement record representing the transfer
  INSERT INTO public.stock_movements (
    company_id,
    stock_id,
    movement_type,
    source_warehouse_id,
    destination_warehouse_id,
    quantity,
    notes,
    movement_date,
    created_by
  ) VALUES (
    p_company_id,
    p_stock_id,
    'transfer',
    p_source_warehouse_id,
    p_destination_warehouse_id,
    p_quantity,
    p_notes,
    CURRENT_DATE,
    p_created_by
  ) RETURNING id INTO v_movement_id;

  RETURN json_build_object('success', true, 'movement_id', v_movement_id);
END;
$$;
