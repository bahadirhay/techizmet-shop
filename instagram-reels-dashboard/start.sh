#!/usr/bin/env bash
cd "$(dirname "$0")"
(sleep 1; (xdg-open http://localhost:9000 || open http://localhost:9000) >/dev/null 2>&1) &
exec .venv/bin/python server.py
