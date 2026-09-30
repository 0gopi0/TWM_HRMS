-- Full time vs Intern/Probation, set by HR on the People form. Everyone who
-- already exists is full time; HR switches interns/probationers by hand.
ALTER TABLE employees
  ADD COLUMN employment_type VARCHAR(16) NOT NULL DEFAULT 'full_time' AFTER job_title;

-- One row per person per month that got the automatic 1st-of-month leave
-- credit (see leaveCreditService). The primary key is what makes the credit
-- run at most once a month however often the job fires or the host restarts;
-- the amounts record what was actually added. A new joiner gets a zero row
-- for the month they join, so their first credit is the next 1st.
CREATE TABLE IF NOT EXISTS leave_credits (
  employee_id CHAR(36) NOT NULL,
  period CHAR(7) NOT NULL,
  employment_type VARCHAR(16) NOT NULL,
  casual DECIMAL(4,1) NOT NULL DEFAULT 0,
  sick DECIMAL(4,1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (employee_id, period),
  CONSTRAINT fk_lc_emp FOREIGN KEY (employee_id) REFERENCES employees (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
