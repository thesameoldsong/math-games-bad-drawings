"""Dev server: HTTPS on the LAN (WebRTC/crypto.subtle need a secure context on phones).

    uv run --no-project python tools/serve.py            # https://<lan-ip>:8443/
    uv run --no-project python tools/serve.py --port 9000

The certificate is self-signed (.dev-cert/, generated once with openssl) —
phones will warn once; choose "advanced → proceed".
"""

import argparse
import http.server
import socket
import ssl
import subprocess
from functools import partial
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CERT_DIR = ROOT / ".dev-cert"


def lan_ip() -> str:
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
        try:
            s.connect(("192.168.0.1", 1))
            return s.getsockname()[0]
        except OSError:
            return "127.0.0.1"


def ensure_cert(ip: str) -> None:
    if (CERT_DIR / "cert.pem").exists():
        return
    CERT_DIR.mkdir(exist_ok=True)
    subprocess.run(
        [
            "openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "825",
            "-keyout", str(CERT_DIR / "key.pem"), "-out", str(CERT_DIR / "cert.pem"),
            "-subj", "/CN=math-games-dev",
            "-addext", f"subjectAltName=IP:{ip},IP:127.0.0.1,DNS:localhost",
        ],
        check=True,
    )


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8443)
    args = ap.parse_args()

    ip = lan_ip()
    ensure_cert(ip)
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ctx.load_cert_chain(CERT_DIR / "cert.pem", CERT_DIR / "key.pem")

    handler = partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    httpd = http.server.ThreadingHTTPServer(("0.0.0.0", args.port), handler)
    httpd.socket = ctx.wrap_socket(httpd.socket, server_side=True)
    print(f"https://{ip}:{args.port}/  (and https://localhost:{args.port}/)", flush=True)
    httpd.serve_forever()


if __name__ == "__main__":
    main()
