CREATE TABLE IF NOT EXISTS leave_entitlements (
  employee_id CHAR(36) NOT NULL,
  year SMALLINT NOT NULL,
  leave_type VARCHAR(32) NOT NULL,
  days INT NOT NULL,
  PRIMARY KEY (employee_id, year, leave_type),
  CONSTRAINT fk_le_emp FOREIGN KEY (employee_id) REFERENCES employees (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
