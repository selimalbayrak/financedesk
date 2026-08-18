-- Link transactions to journal_entries for cascade deletion
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS journal_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE CASCADE;
