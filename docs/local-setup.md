# Local development setup

The API uses a **native** MySQL 8 or MariaDB server on this machine (`127.0.0.1:3306`). Do not use a Docker database for local work unless that decision changes later.

## Install and start the server (Arch Linux)

MariaDB is the usual Arch package and is protocol-compatible with MySQL for this project:

```bash
sudo pacman -S mariadb
sudo mariadb-install-db --user=mysql --basedir=/usr --datadir=/var/lib/mysql
sudo systemctl enable --now mariadb
```

If you install official MySQL instead, enable `mysqld` and use the `mysql` client in the commands below.

Confirm the service is listening locally:

```bash
systemctl is-active mariadb
mysqladmin ping -h 127.0.0.1 -P 3306
```

Bind-address should remain localhost (default). Do not expose 3306 on the LAN while developing.

## Create the database and app user

1. Copy [`.env.example`](../.env.example) to `.env` and set `DATABASE_PASSWORD` to a strong local password.
2. Edit [`scripts/setup-local-mysql.sql`](../scripts/setup-local-mysql.sql) and replace `CHANGE_ME` with that same password (do not commit the edited file).
3. Run as root:

```bash
sudo mysql < scripts/setup-local-mysql.sql
```

4. Verify:

```bash
mysql -h 127.0.0.1 -P 3306 -u twm_hrms_app -p twm_hrms -e "SELECT DATABASE();"
```

The Express pool will read `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, and `DATABASE_PASSWORD`. Changing to a remote MySQL later is configuration only.

## Start and stop

```bash
sudo systemctl start mariadb
sudo systemctl stop mariadb
```

## What is not stored in git

- `.env` (real passwords)
- Production hosts or credentials
- Any dump of employee or payroll data
