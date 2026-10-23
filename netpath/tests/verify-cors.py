"""實測內建端點, 只保存必要 headers, 不記錄 IP 或定位資訊."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
import subprocess

ORIGIN = "https://example.com"
ENDPOINTS = [
    ("https://speed.cloudflare.com/__down?bytes=0", False),
    ("https://1.1.1.1/cdn-cgi/trace", False),
    ("https://asia-east1-5tkroniexa-de.a.run.app/api/ping", False),
    ("https://us-west1-5tkroniexa-uw.a.run.app/api/ping", False),
    ("https://us-east1-5tkroniexa-ue.a.run.app/api/ping", False),
    ("https://speed.cloudflare.com/__down?bytes=1000000", False),
    ("https://speed.cloudflare.com/__down?bytes=10000000", False),
    ("https://speed.cloudflare.com/__up", True),
]


def verify(endpoint):
    url, upload = endpoint
    command = ["curl", "-sS", "-D", "-", "-o", "/dev/null", "--max-time", "25", "-H", f"Origin: {ORIGIN}"]
    if upload:
        command += ["-H", "Content-Type: text/plain", "--data-binary", "netpath-verification"]
    result = subprocess.run(command + [url], capture_output=True, text=True, check=False)
    headers = []
    for line in result.stdout.splitlines():
        name = line.partition(":")[0].lower()
        if line.startswith("HTTP/") or name in ("access-control-allow-origin", "access-control-allow-headers", "access-control-expose-headers", "timing-allow-origin", "content-length"):
            headers.append(line.rstrip())
        elif name == "server-timing" and "cfl4" not in line.lower():
            headers.append(line.rstrip())
    if result.returncode:
        headers.append(f"curl exit {result.returncode}: 無法完成請求, 不保存可能含連線資訊的 stderr")
    return f"{url}{' (POST, Content-Type: text/plain)' if upload else ''}\n" + "\n".join(headers)


if __name__ == "__main__":
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(verify, ENDPOINTS))
    content = f"""CORS 驗證日期: {datetime.now(timezone.utc).strftime('%Y-%m-%d')} (UTC)
Origin: {ORIGIN}
指令: curl -sS -D - -o /dev/null --max-time 25 -H 'Origin: https://example.com' '<url>'
POST 另加: -H 'Content-Type: text/plain' --data-binary 'netpath-verification'
僅保留 HTTP 狀態與必要 CORS / Timing headers, 不記錄個人 IP 或定位 headers
驗證腳本: tests/verify-cors.py

""" + "\n\n".join(results) + """

判讀:
- ACAO (*) 允許跨來源 fetch, credentials 使用 omit
- Cloudflare 回應有 timing-allow-origin: *, 可讀 Resource Timing
- GCPing / trace 若未回傳 timing-allow-origin, 細項不可讀, 不顯示假 0
- cf-ray 若未列在 expose-headers, JS 無法讀取. 優先讀 cf-meta-colo, trace 僅讀 colo
- 本次 cfRequestDuration 未出現在回應. 只顯示完整 HTTP 時間, 不扣其他名稱的 duration
- Cache busting query 另由 Chrome 真實連線驗證
- 公共服務可用性與 headers 可能改變, 以當次實際回應為準
"""
    output = Path(__file__).resolve().parents[1] / "cors-verification.txt"
    output.write_text(content, encoding="utf-8")
    print(content)
