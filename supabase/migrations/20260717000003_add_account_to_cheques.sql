-- Add account_id column to cheques_notes table
ALTER TABLE cheques_notes 
ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id) ON DELETE SET NULL;
