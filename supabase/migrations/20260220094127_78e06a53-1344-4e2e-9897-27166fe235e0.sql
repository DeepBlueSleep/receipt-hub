
-- Add company and account fields to receipts
ALTER TABLE public.receipts
ADD COLUMN company_name TEXT,
ADD COLUMN company_xero_id TEXT,
ADD COLUMN account_name TEXT;
