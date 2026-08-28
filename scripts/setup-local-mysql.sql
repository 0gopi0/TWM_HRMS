-- Run as MySQL/MariaDB root on localhost.
-- Creates the local HRMS database and a least-privilege app user.
-- Replace CHANGE_ME with the password stored in .env (never commit the real password).

CREATE DATABASE IF NOT EXISTS twm_hrms
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'twm_hrms_app'@'localhost' IDENTIFIED BY 'CHANGE_ME';

GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES
  ON twm_hrms.* TO 'twm_hrms_app'@'localhost';

FLUSH PRIVILEGES;
