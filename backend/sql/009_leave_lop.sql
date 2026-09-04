-- Distinguishes an admin-logged LOP (loss of pay) entry from an employee's
-- own unpaid-leave request — both use leave_type='unpaid', but only the
-- admin-logged kind should display as "LOP" with its reason surfaced.
ALTER TABLE leave_requests
  ADD COLUMN is_lop TINYINT(1) NOT NULL DEFAULT 0 AFTER reason;
