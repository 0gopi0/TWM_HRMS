#!/usr/bin/env bash
# Start the local MySQL server (mise-installed, user-space) if it isn't running.
# Run from the repo root or anywhere — paths are absolute.
set -euo pipefail

MYSQL_BIN="$HOME/.local/share/mise/installs/mysql/8.4.11/bin"
MYSQL_LIBS="$HOME/.local/share/mysql-libs/usr/lib"
DATA_DIR="$HOME/.local/share/mysql-data"
RUN_DIR="$HOME/.local/share/mysql-run"
CONF="$RUN_DIR/my.cnf"

# Already running? Port check is enough.
if (exec 3<>/dev/tcp/127.0.0.1/3306) 2>/dev/null; then
  exec 3>&- || true
  echo "MySQL is already running on 127.0.0.1:3306."
  exit 0
fi

if [ ! -d "$DATA_DIR/mysql" ]; then
  echo "Data dir not initialized. Run:"
  echo "  LD_LIBRARY_PATH=$MYSQL_LIBS $MYSQL_BIN/mysqld --defaults-file=$CONF --initialize-insecure"
  exit 1
fi

export LD_LIBRARY_PATH="$MYSQL_LIBS:${LD_LIBRARY_PATH:-}"
"$MYSQL_BIN/mysqld" --defaults-file="$CONF" --daemonize
sleep 3

if (exec 3<>/dev/tcp/127.0.0.1/3306) 2>/dev/null; then
  exec 3>&- || true
  echo "MySQL started on 127.0.0.1:3306."
else
  echo "MySQL failed to start. Check $RUN_DIR/mysqld.err"
  exit 1
fi
