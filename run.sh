#!/usr/bin/env bash
# ============================================================
#  AUTO LIHAT STATUS BY IYAN
#  Copyright (c) 2026 Iyan. Seluruh hak cipta dilindungi.
#  Copyright (c) 2026 Iyan. All rights reserved.
# ------------------------------------------------------------
#  [ID] Script ini dibuat oleh Iyan. Dilarang keras memperjual-
#  belikan, mengklaim ulang, atau mendistribusikan ulang script
#  ini — baik sebagian maupun seluruhnya — tanpa izin tertulis
#  dari pembuat. Jika menemukan pihak yang memperjualbelikan
#  script ini, segera hubungi pembuat melalui WhatsApp di bawah.
#  [EN] This script was created by Iyan. Reselling, rebranding,
#  or redistributing this script — in whole or in part — without
#  written permission from the creator is strictly prohibited.
#  If you find anyone reselling this script, please contact the
#  creator immediately via WhatsApp below.
# ------------------------------------------------------------
#  WhatsApp: +6282161429908
# ============================================================
#
# Supervisor auto-lihat-status-by-iyan: hidup terus, restart otomatis kalau proses mati/crash.
# Single instance via flock. Stop: kill $(cat bot-sup.pid)
# Pola sama seperti readsw/run.sh (cd dulu, tutup fd lock di child).
set -u
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
LOCK="$BASE_DIR/bot.lock"
LOG="$BASE_DIR/bot.log"

export NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/hatch-egress-ca.crt
export NO_PROXY=localhost,127.0.0.1
export no_proxy=localhost,127.0.0.1

exec 9>"$LOCK"
if ! flock -n 9; then echo "auto-lihat-status-by-iyan supervisor sudah jalan"; exit 0; fi
echo $$ > "$BASE_DIR/bot-sup.pid"

CHILD=""
# WAJIB: kode bot pakai process.cwd() untuk .env, sessions/, config.json.
cd "$BASE_DIR"

while true; do
  echo "[$(date -u +%FT%TZ)] supervisor: menjalankan bot..." >>"$LOG"
  stdbuf -o0 -e0 node "$BASE_DIR/src/index.js" 9>&- >>"$LOG" 2>&1 &
  CHILD=$!
  wait "$CHILD"
  code=$?
  CHILD=""
  echo "[$(date -u +%FT%TZ)] supervisor: bot keluar (code $code), restart 3 dtk..." >>"$LOG"
  sleep 3
done
