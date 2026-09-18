-- Digital Marketing is a department the original seed doesn't have. Adding it
-- here as well means an already-provisioned database — where the seeder no
-- longer runs because it only fires on an empty users table — picks it up on
-- the next boot. INSERT IGNORE keeps the migration a no-op if the row is
-- already there.
INSERT IGNORE INTO departments (id, name) VALUES ('dept-digital-marketing', 'Digital Marketing');
