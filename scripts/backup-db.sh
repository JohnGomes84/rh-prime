#!/usr/bin/env bash
# Backup do MySQL (Hostinger) via mysqldump.
# Uso:   ./scripts/backup-db.sh [destino]
# Exige: mysqldump no PATH; DATABASE_URL em .env.local ou env do shell.
#
# Saída: <destino>/rh-prime-YYYY-MM-DD-HHmm.sql.gz
# Default destino: ./backups
#
# Cron exemplo (Linux, diário 03:00):
#   0 3 * * * cd /caminho/rh-prime && ./scripts/backup-db.sh ~/backups/rh-prime >> ~/backups/rh-prime/backup.log 2>&1

set -euo pipefail

DEST="${1:-./backups}"
mkdir -p "$DEST"

# Carrega DATABASE_URL de .env.local se não estiver no env
if [ -z "${DATABASE_URL:-}" ] && [ -f ".env.local" ]; then
  set -a
  # shellcheck disable=SC1091
  . .env.local
  set +a
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERRO: DATABASE_URL não definido (.env.local ou export)" >&2
  exit 1
fi

# Parser simples: mysql://user:pass@host:port/db
RE='^mysql://([^:]+):([^@]+)@([^:/]+)(:[0-9]+)?/(.+)$'
if [[ ! "$DATABASE_URL" =~ $RE ]]; then
  echo "ERRO: DATABASE_URL não bate com formato mysql://user:pass@host:port/db" >&2
  exit 1
fi

DB_USER="${BASH_REMATCH[1]}"
DB_PASS="${BASH_REMATCH[2]}"
DB_HOST="${BASH_REMATCH[3]}"
DB_PORT="${BASH_REMATCH[4]:-:3306}"
DB_PORT="${DB_PORT#:}"
DB_NAME="${BASH_REMATCH[5]}"

STAMP="$(date +%Y-%m-%d-%H%M)"
OUT="$DEST/rh-prime-$STAMP.sql.gz"

echo "[backup] $(date) — dump de $DB_NAME @ $DB_HOST:$DB_PORT → $OUT"

mysqldump \
  -h "$DB_HOST" \
  -P "$DB_PORT" \
  -u "$DB_USER" \
  -p"$DB_PASS" \
  --single-transaction \
  --quick \
  --no-tablespaces \
  --set-gtid-purged=OFF \
  --skip-lock-tables \
  --hex-blob \
  "$DB_NAME" \
  | gzip -9 > "$OUT"

SIZE=$(du -h "$OUT" | cut -f1)
echo "[backup] OK — $SIZE em $OUT"

# Retenção: manter últimos 30 dumps, apaga mais antigos
echo "[backup] Aplicando retenção (mantém 30 mais recentes)..."
ls -1t "$DEST"/rh-prime-*.sql.gz 2>/dev/null | tail -n +31 | xargs -r rm -f

echo "[backup] Concluído."
