-- Activity Log: denormalized actor/target names and a human-readable summary
-- captured at write time, so a historical entry keeps reading correctly even
-- after the person involved is renamed or removed. Only rows with a summary
-- show up in the curated Activity Log — routine writes that don't set one
-- (e.g. attendance clock-in/out) stay in audit_logs for other purposes but
-- don't clutter the HR-facing feed.
ALTER TABLE audit_logs
  ADD COLUMN actor_employee_id CHAR(36) NULL AFTER actor_user_id,
  ADD COLUMN actor_name VARCHAR(160) NULL AFTER actor_employee_id,
  ADD COLUMN target_employee_id CHAR(36) NULL AFTER entity_id,
  ADD COLUMN target_name VARCHAR(160) NULL AFTER target_employee_id,
  ADD COLUMN summary VARCHAR(500) NULL AFTER target_name;

ALTER TABLE audit_logs
  ADD INDEX idx_audit_created (created_at),
  ADD INDEX idx_audit_actor_emp (actor_employee_id),
  ADD INDEX idx_audit_target_emp (target_employee_id);
