-- Manual payroll: custom line items (extras) and PF/tax deduction.
ALTER TABLE payslips
  ADD COLUMN gross_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN pf_tax DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN extras JSON NULL;
