-- Run as MySQL/MariaDB root on localhost.
-- Creates the local HRMS database and a least-privilege app user.
-- Replace CHANGE_ME with the password stored in .env (never commit the real password).

CREATE DATABASE IF NOT EXISTS twm_hrms
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- The app connects over TCP (127.0.0.1), so create the user for that host too,
-- not just 'localhost' (socket) — MySQL treats them as separate accounts.
CREATE USER IF NOT EXISTS 'twm_hrms_app'@'localhost' IDENTIFIED BY 'CHANGE_ME';
CREATE USER IF NOT EXISTS 'twm_hrms_app'@'127.0.0.1' IDENTIFIED BY 'CHANGE_ME';

GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES
  ON twm_hrms.* TO 'twm_hrms_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES
  ON twm_hrms.* TO 'twm_hrms_app'@'127.0.0.1';

FLUSH PRIVILEGES;
