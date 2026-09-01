CREATE TABLE IF NOT EXISTS company_holidays (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  holiday_date DATE NOT NULL,
  kind VARCHAR(16) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_holiday_date_name (holiday_date, name),
  INDEX idx_holiday_date (holiday_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
