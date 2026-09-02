CREATE TABLE IF NOT EXISTS attendance_entries (
  id CHAR(36) NOT NULL PRIMARY KEY,
  employee_id CHAR(36) NOT NULL,
  clock_in_at DATETIME NOT NULL,
  clock_out_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_att_emp_in (employee_id, clock_in_at),
  CONSTRAINT fk_att_emp FOREIGN KEY (employee_id) REFERENCES employees (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
