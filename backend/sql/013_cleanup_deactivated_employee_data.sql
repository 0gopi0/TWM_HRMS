-- One-time cleanup for people who were deactivated under the old
-- delete-but-keep-history behavior: their own leave/attendance/pay data
-- lingered (e.g. showing up in the Leave page's balance list) even though
-- HR had already removed them. Deleting someone now erases this data
-- immediately (see mysqlStore.deleteEmployee) — this migration catches up
-- everyone who was already deactivated before that change. The employee
-- row itself is left as-is (inactive, out of the directory); this only
-- clears the data that belonged to them.

DELETE la FROM leave_approvals la
  INNER JOIN leave_requests lr ON lr.id = la.leave_request_id
  INNER JOIN employees e ON e.id = lr.employee_id
  WHERE e.employment_status = 'inactive';

DELETE lr FROM leave_requests lr
  INNER JOIN employees e ON e.id = lr.employee_id
  WHERE e.employment_status = 'inactive';

DELETE le FROM leave_entitlements le
  INNER JOIN employees e ON e.id = le.employee_id
  WHERE e.employment_status = 'inactive';

DELETE at FROM attendance_entries at
  INNER JOIN employees e ON e.id = at.employee_id
  WHERE e.employment_status = 'inactive';

DELETE ss FROM salary_structures ss
  INNER JOIN employees e ON e.id = ss.employee_id
  WHERE e.employment_status = 'inactive';

DELETE ps FROM payslips ps
  INNER JOIN employees e ON e.id = ps.employee_id
  WHERE e.employment_status = 'inactive';

UPDATE employees m
  INNER JOIN employees e ON e.id = m.manager_id
  SET m.manager_id = NULL
  WHERE e.employment_status = 'inactive';

UPDATE employees m
  INNER JOIN employees e ON e.id = m.leave_approver_id
  SET m.leave_approver_id = NULL
  WHERE e.employment_status = 'inactive';

UPDATE teams t
  INNER JOIN employees e ON e.id = t.leader_employee_id
  SET t.leader_employee_id = NULL
  WHERE e.employment_status = 'inactive';

UPDATE leave_requests lr
  INNER JOIN employees e ON e.id = lr.approver_employee_id
  SET lr.approver_employee_id = NULL
  WHERE e.employment_status = 'inactive';
