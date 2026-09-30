-- Which balance a leave request counts against, when that isn't its own
-- type. Intern/Probation staff get no monthly sick leave, so once their sick
-- balance runs out a sick leave is charged to their casual balance instead
-- (see leaveService.resolveChargedBalance) — it stays a sick leave with no
-- notice period, only the balance it draws from changes. Recorded per
-- request, not derived from the person's current employment type, so
-- switching someone to full time later doesn't re-count past leave.
-- NULL = charged to its own leave type (every existing row).
ALTER TABLE leave_requests
  ADD COLUMN charged_to VARCHAR(16) NULL AFTER leave_type;
