-- Foundation schema. InnoDB, utf8mb4. Run against database twm_hrms.

CREATE TABLE IF NOT EXISTS roles (
  id CHAR(36) NOT NULL PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS permissions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  code VARCHAR(64) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id CHAR(36) NOT NULL,
  permission_id CHAR(36) NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles (id),
  CONSTRAINT fk_rp_perm FOREIGN KEY (permission_id) REFERENCES permissions (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS departments (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  company_id TINYINT NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role_code VARCHAR(32) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  must_reset_password TINYINT(1) NOT NULL DEFAULT 0,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role (role_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS employees (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NULL UNIQUE,
  employee_number VARCHAR(32) NOT NULL UNIQUE,
  legal_name VARCHAR(255) NOT NULL,
  department_id CHAR(36) NULL,
  team_id CHAR(36) NULL,
  manager_id CHAR(36) NULL,
  employment_status VARCHAR(16) NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_employees_manager (manager_id),
  INDEX idx_employees_number (employee_number),
  CONSTRAINT fk_emp_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_emp_dept FOREIGN KEY (department_id) REFERENCES departments (id),
  CONSTRAINT fk_emp_mgr FOREIGN KEY (manager_id) REFERENCES employees (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS teams (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  department_id CHAR(36) NOT NULL,
  leader_employee_id CHAR(36) NULL,
  CONSTRAINT fk_team_dept FOREIGN KEY (department_id) REFERENCES departments (id),
  CONSTRAINT fk_team_leader FOREIGN KEY (leader_employee_id) REFERENCES employees (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE employees
  ADD CONSTRAINT fk_emp_team FOREIGN KEY (team_id) REFERENCES teams (id);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  INDEX idx_refresh_user (user_id),
  CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS leave_requests (
  id CHAR(36) NOT NULL PRIMARY KEY,
  employee_id CHAR(36) NOT NULL,
  leave_type VARCHAR(32) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(32) NOT NULL,
  reason VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_leave_emp_status (employee_id, status),
  CONSTRAINT fk_leave_emp FOREIGN KEY (employee_id) REFERENCES employees (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS leave_approvals (
  id CHAR(36) NOT NULL PRIMARY KEY,
  leave_request_id CHAR(36) NOT NULL,
  step VARCHAR(32) NOT NULL,
  actor_user_id CHAR(36) NOT NULL,
  decision VARCHAR(16) NOT NULL,
  comment VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_la_req FOREIGN KEY (leave_request_id) REFERENCES leave_requests (id),
  CONSTRAINT fk_la_actor FOREIGN KEY (actor_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS salary_structures (
  id CHAR(36) NOT NULL PRIMARY KEY,
  employee_id CHAR(36) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  base_amount DECIMAL(12,2) NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE NULL,
  CONSTRAINT fk_sal_emp FOREIGN KEY (employee_id) REFERENCES employees (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payslips (
  id CHAR(36) NOT NULL PRIMARY KEY,
  employee_id CHAR(36) NOT NULL,
  period CHAR(7) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  base_amount DECIMAL(12,2) NOT NULL,
  net_amount DECIMAL(12,2) NOT NULL,
  created_by CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_payslip_period (employee_id, period),
  INDEX idx_payslips_emp_period (employee_id, period),
  CONSTRAINT fk_ps_emp FOREIGN KEY (employee_id) REFERENCES employees (id),
  CONSTRAINT fk_ps_user FOREIGN KEY (created_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payment_runs (
  id CHAR(36) NOT NULL PRIMARY KEY,
  idempotency_key VARCHAR(64) NOT NULL UNIQUE,
  status VARCHAR(16) NOT NULL,
  created_by CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pr_user FOREIGN KEY (created_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id CHAR(36) NOT NULL PRIMARY KEY,
  actor_user_id CHAR(36) NULL,
  action VARCHAR(64) NOT NULL,
  entity VARCHAR(64) NOT NULL,
  entity_id CHAR(36) NULL,
  before_json JSON NULL,
  after_json JSON NULL,
  ip VARCHAR(64) NULL,
  request_id CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_entity (entity, entity_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
