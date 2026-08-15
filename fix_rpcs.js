const fs = require('fs');
const f1 = fs.readFileSync('supabase/migrations/20260815184645_step5_invoices_journals.sql', 'utf8');
const f2 = fs.readFileSync('supabase/migrations/20260815214500_step7_expense_personnel_cari.sql', 'utf8');

// Extract approve_invoice
let approveInvoice = f1.match(/CREATE OR REPLACE FUNCTION public\.approve_invoice([\s\S]*?)END;\n\$\$;/)[0];
// Fix approve_invoice type cast
approveInvoice = approveInvoice.replace(
    /CASE WHEN v_invoice\.type = 'PURCHASE' THEN 'PURCHASE_INVOICE'::public\.journal_entry_type ELSE 'SALES_INVOICE'::public\.journal_entry_type END/g,
    "(CASE WHEN v_invoice.type = 'PURCHASE' THEN 'PURCHASE_INVOICE' ELSE 'SALES_INVOICE' END)::public.journal_entry_type"
);

// Extract process_expense_payment
let processExpensePayment = f2.match(/CREATE OR REPLACE FUNCTION public\.process_expense_payment([\s\S]*?)END;\n\$\$;/)[0];
processExpensePayment = processExpensePayment.replace(
    /'Gider Ödemesi'/g,
    "'PAYMENT'::public.journal_entry_type"
);

// Extract process_personnel_transaction
let processPersonnelTransaction = f2.match(/CREATE OR REPLACE FUNCTION public\.process_personnel_transaction([\s\S]*?)END;\n\$\$;/)[0];
processPersonnelTransaction = processPersonnelTransaction.replace(
    /CASE WHEN p_type = 'ACCRUAL' THEN 'Maaş Tahakkuku' ELSE 'Maaş Ödemesi' END/g,
    "(CASE WHEN p_type = 'ACCRUAL' THEN 'MANUAL' ELSE 'PAYMENT' END)::public.journal_entry_type"
);

// Extract process_cari_payment
let processCariPayment = f2.match(/CREATE OR REPLACE FUNCTION public\.process_cari_payment([\s\S]*?)END;\n\$\$;/)[0];
processCariPayment = processCariPayment.replace(
    /CASE WHEN p_direction = 'COLLECTION' THEN 'Cari Tahsilat' ELSE 'Cari Ödeme' END/g,
    "(CASE WHEN p_direction = 'COLLECTION' THEN 'COLLECTION' ELSE 'PAYMENT' END)::public.journal_entry_type"
);

const migration = `-- FIX ENUM TYPE MISMATCHES IN RPCs\n${approveInvoice}\n\n${processExpensePayment}\n\n${processPersonnelTransaction}\n\n${processCariPayment}\n`;

fs.writeFileSync('supabase/migrations/20260816000001_step9_fix_journal_entry_enum.sql', migration);
