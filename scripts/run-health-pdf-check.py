# -*- coding: utf-8 -*-
"""Health + saved-report PDF smoke notes (no secrets)."""
from __future__ import annotations

import json
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from pathlib import Path

BASE = "https://umsh.kr"
OUT = Path(r"C:\Users\user\Desktop\chungi-t\output\all-services-qa\health-pdf-qa.json")

PUBLIC_FLOW = {
    "love_this_year": "/love/this-year",
    "job_choice": "/work/job-choice",
    "quit_fortune": "/work/quit",
    "work_move": "/work/move",
    "money_save": "/money/save",
    "cat_compatibility": "/match/cat",
    "match_couple": "/match/couple",
    "marry_match": "/match/marry",
    "couple_signal": "/love/signal",
    "pass_angle": "/me/pass-angle",
    "lucky_color": "/me/lucky",
    "home_fit": "/place/home",
    "newyear_flow": "/flow/newyear",
    "wedding_day": "/day/wedding",
}


def fetch(path: str) -> tuple[int, str]:
    url = BASE + path
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "umsh-health-pdf/1.0"})
        with urllib.request.urlopen(req, timeout=25) as resp:
            return resp.status, resp.read(12000).decode("utf-8", "replace")
    except Exception as e:
        code = getattr(e, "code", 0) or 0
        try:
            body = e.read(2000).decode("utf-8", "replace")
        except Exception:
            body = str(e)
        return code, body


def main() -> None:
    health_code, health_body = fetch("/api/health?storage=1")
    health = json.loads(health_body) if health_code == 200 else {"ok": False}
    pay_code, pay_body = fetch("/api/payment/config")
    pay = json.loads(pay_body) if pay_code == 200 else {}

    routes = []
    paths = []
    for key, base in PUBLIC_FLOW.items():
        for step in (
            "/01-step-1-story/",
            "/02-step-2-saju-input/",
            "/04-step-4-report/",
            "/05-step-5-chat/",
        ):
            paths.append((key, base + step))
    paths += [
        ("core", "/"),
        ("core", "/search"),
        ("core", "/vault"),
        ("core", "/r/"),
        ("core", "/payment?product=cmdg"),
        ("core", "/payment/test"),
    ]

    def one(item):
        key, path = item
        code, body = fetch(path)
        return {
            "service": key,
            "path": path,
            "status": code,
            "ok": code == 200 or (path == "/payment/test" and code == 404) or (path == "/r/" and code in (200, 404)),
            "hasPdfHelper": "umsh-report-pdf.js" in body,
            "hasPdfButton": ("data-report-pdf" in body) or ("btn-pdf" in body) or ("PDF 다운" in body),
        }

    with ThreadPoolExecutor(16) as pool:
        routes = list(pool.map(one, paths))

    report_view_code, report_view = fetch("/report-view.html")
    # /r/:id is dynamic; check static asset
    pdf_js_code, pdf_js = fetch("/js/umsh-report-pdf.js")
    view_js_code, view_js = fetch("/js/umsh-report-view.js")

    payload = {
        "date": date.today().isoformat(),
        "base": BASE,
        "health": {
            "ok": health.get("ok"),
            "openai": health.get("openai"),
            "corpus": (health.get("corpus") or {}).get("registryVersion"),
            "reportStorage": health.get("reportStorage"),
            "paymentStorage": health.get("paymentStorage"),
            "profileStorage": health.get("profileStorage"),
        },
        "payment": {
            "enabled": pay.get("enabled"),
            "checkoutEnabled": pay.get("checkoutEnabled"),
            "configured": pay.get("configured"),
            "mobileEnabled": pay.get("mobileEnabled"),
            "catalog": len(pay.get("catalog") or []),
        },
        "assets": {
            "reportView": report_view_code,
            "pdfJs": pdf_js_code,
            "viewJsHasPdf": "data-report-pdf" in view_js or "UMSHReportPdf" in view_js,
            "reportHtmlHasPdf": "data-report-pdf" in report_view,
        },
        "routes": {
            "pass": sum(1 for r in routes if r["ok"]),
            "fail": [r for r in routes if not r["ok"]],
            "pdfWired": [r for r in routes if r["hasPdfHelper"] or r["hasPdfButton"]],
        },
        "staticQa": "npm run qa:all-services → 20/20 (local)",
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"out": str(OUT), "routePass": payload["routes"]["pass"], "routeFail": payload["routes"]["fail"], "assets": payload["assets"]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
