-- A reporting manager can clock a team member in for a missed punch. This
-- column records who did it (NULL for an ordinary self clock-in), so the
-- People page can show "manually added by" without joining audit_logs.
ALTER TABLE attendance_entries
  ADD COLUMN created_by_user_id CHAR(36) NULL AFTER clock_out_at,
  ADD CONSTRAINT fk_att_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE SET NULL;
