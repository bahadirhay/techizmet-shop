#!/usr/bin/env python3
"""Instagram Reels dashboard — http://localhost:9000 (yalnızca standart kütüphane)."""
import json
import subprocess
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HERE = Path(__file__).parent
PORT = 9000
LOG_LIMIT = 500

state = {"proc": None, "log": [], "waiting_login": False, "account": ""}
lock = threading.Lock()


def running() -> bool:
    p = state["proc"]
    return p is not None and p.poll() is None


def reader(proc):
    for line in proc.stdout:
        line = line.rstrip("\n")
        with lock:
            state["log"].append(line)
            del state["log"][:-LOG_LIMIT]
            if line.startswith("GIRIS_BEKLENIYOR"):
                state["waiting_login"] = True
    with lock:
        state["waiting_login"] = False
        state["log"].append("— işlem sona erdi —")


def start(account, max_reels, sound):
    with lock:
        if running():
            return False, "Zaten çalışıyor"
        cmd = [sys.executable, "-u", str(HERE / "player.py"), account, "--max", str(max_reels)]
        if sound:
            cmd.append("--sound")
        proc = subprocess.Popen(cmd, cwd=HERE, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                stderr=subprocess.STDOUT, text=True)
        state.update(proc=proc, log=[], waiting_login=False, account=account)
    threading.Thread(target=reader, args=(proc,), daemon=True).start()
    return True, "Başlatıldı"


def stop():
    with lock:
        if running():
            state["proc"].terminate()
            return True
    return False


def proceed():
    with lock:
        if running() and state["waiting_login"]:
            state["proc"].stdin.write("\n")
            state["proc"].stdin.flush()
            state["waiting_login"] = False
            return True
    return False


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, body, ctype="application/json"):
        data = body if isinstance(body, bytes) else json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype + "; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path in ("/", "/index.html"):
            self._send(200, (HERE / "index.html").read_bytes(), "text/html")
        elif self.path == "/api/status":
            with lock:
                self._send(200, {"running": running(), "waiting_login": state["waiting_login"],
                                 "account": state["account"], "log": state["log"]})
        else:
            self._send(404, {"error": "not found"})

    def do_POST(self):
        n = int(self.headers.get("Content-Length") or 0)
        try:
            body = json.loads(self.rfile.read(n) or b"{}")
        except ValueError:
            return self._send(400, {"error": "bad json"})
        if self.path == "/api/start":
            account = str(body.get("account", "")).strip()
            if not account:
                return self._send(400, {"error": "Hesap adresi gerekli"})
            try:
                max_reels = max(1, min(int(body.get("max", 50)), 1000))
            except (TypeError, ValueError):
                return self._send(400, {"error": "Geçersiz sayı"})
            ok, msg = start(account, max_reels, bool(body.get("sound")))
            self._send(200 if ok else 409, {"ok": ok, "message": msg})
        elif self.path == "/api/stop":
            self._send(200, {"ok": stop()})
        elif self.path == "/api/continue":
            self._send(200, {"ok": proceed()})
        else:
            self._send(404, {"error": "not found"})

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"Dashboard hazır: http://localhost:{PORT}  (durdurmak için Ctrl+C)", flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        stop()
