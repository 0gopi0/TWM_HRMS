-- Leave can be taken in half-day increments (see half_day on leave_requests),
-- so entitlement quotas need the same precision. INT truncated a value like
-- 2.5 down to 2 (or errored under strict SQL mode) when HR set an allotment.
ALTER TABLE leave_entitlements MODIFY COLUMN days DECIMAL(5,1) NOT NULL;
