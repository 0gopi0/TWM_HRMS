-- Add the current approver to leave requests so the approval chain
-- can follow the manager hierarchy instead of a fixed 3-step chain.
ALTER TABLE leave_requests
  ADD COLUMN approver_employee_id CHAR(36) NULL AFTER status,
  ADD CONSTRAINT fk_leave_approver FOREIGN KEY (approver_employee_id) REFERENCES employees (id);

-- Half-day leave support: half_day=1 means 0.5 days counted for a single-day leave.
ALTER TABLE leave_requests
  ADD COLUMN half_day TINYINT(1) NOT NULL DEFAULT 0 AFTER approver_employee_id;

-- Sales-team leave approval override: round to the owner instead of the team lead.
ALTER TABLE employees
  ADD COLUMN leave_approver_id CHAR(36) NULL AFTER manager_id,
  ADD CONSTRAINT fk_emp_leave_approver FOREIGN KEY (leave_approver_id) REFERENCES employees (id);

