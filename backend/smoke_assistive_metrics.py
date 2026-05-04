"""Quick smoke check for Assistive AI metrics endpoints.

Run from backend folder:
    python smoke_assistive_metrics.py

The script starts a temporary local server on 127.0.0.1:8765,
queries the metrics endpoints, then shuts the server down.
"""

from __future__ import annotations

import json
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, Dict, Iterable

import requests


ROOT_DIR = Path(__file__).resolve().parent


def _assert_keys(
    payload: Dict[str, Any],
    required: Iterable[str],
    name: str,
) -> None:
    missing = [key for key in required if key not in payload]
    if missing:
        raise AssertionError(f"{name} missing keys: {', '.join(missing)}")


def _start_server(port: int = 8765) -> subprocess.Popen[str]:
    return subprocess.Popen(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "main:app",
            "--host",
            "127.0.0.1",
            "--port",
            str(port),
            "--log-level",
            "warning",
        ],
        cwd=str(ROOT_DIR),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        text=True,
    )


def _wait_for_server(base_url: str, timeout_seconds: float = 15.0) -> None:
    deadline = time.time() + timeout_seconds
    last_error = None
    while time.time() < deadline:
        try:
            res = requests.get(
                f"{base_url}/api/assistive/metrics",
                timeout=2,
            )
            if res.status_code in (200, 500):
                return
        except requests.RequestException as err:
            last_error = err
        time.sleep(0.5)
    raise RuntimeError(f"Server did not start in time: {last_error}")


def main() -> int:
    base_url = "http://127.0.0.1:8765"
    server = _start_server(port=8765)

    try:
        _wait_for_server(base_url)

        metrics_res = requests.get(
            f"{base_url}/api/assistive/metrics",
            timeout=10,
        )
        if metrics_res.status_code != 200:
            print(
                "FAIL /api/assistive/metrics "
                f"-> HTTP {metrics_res.status_code}: {metrics_res.text}"
            )
            return 1

        metrics_data = metrics_res.json()
        _assert_keys(
            metrics_data,
            (
                "total_feedback",
                "helpful_feedback",
                "helpfulness_rate",
                "total_events",
                "feedback_breakdown",
                "event_breakdown",
            ),
            "/api/assistive/metrics",
        )

        dashboard_res = requests.get(
            f"{base_url}/api/assistive/metrics/dashboard",
            params={"days": 30},
            timeout=10,
        )
        if dashboard_res.status_code != 200:
            print(
                "FAIL /api/assistive/metrics/dashboard "
                f"-> HTTP {dashboard_res.status_code}: {dashboard_res.text}"
            )
            return 1

        dashboard_data = dashboard_res.json()
        _assert_keys(
            dashboard_data,
            (
                "window_days",
                "feedback_by_symbol",
                "feedback_by_day",
                "events_by_symbol",
                "events_by_day",
            ),
            "/api/assistive/metrics/dashboard",
        )

        print("PASS Assistive metrics smoke check")
        print("/api/assistive/metrics:")
        print(json.dumps(metrics_data, indent=2, default=str))
        print("/api/assistive/metrics/dashboard?days=30:")
        print(json.dumps(dashboard_data, indent=2, default=str))
        return 0
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AssertionError as err:
        print(f"FAIL {err}")
        raise SystemExit(1)
