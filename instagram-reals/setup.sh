#!/usr/bin/env bash
# Kurulum: sanal ortam + playwright + chromium
set -e
cd "$(dirname "$0")"
python3 -m venv .venv
.venv/bin/pip install -q -r requirements.txt
.venv/bin/playwright install chromium
echo "Kurulum tamam. Başlatmak için: ./start.sh"
