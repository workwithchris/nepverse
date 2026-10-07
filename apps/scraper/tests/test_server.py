from __future__ import annotations

import json
import threading
import time
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer

import pytest

from nvs.server import JobManager, make_handler


@pytest.fixture()
def api():
    manager = JobManager()
    httpd = ThreadingHTTPServer(("127.0.0.1", 0), make_handler(manager))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{httpd.server_address[1]}", manager
    httpd.shutdown()
    httpd.server_close()


def call(url: str, method: str = "GET", body: dict | None = None, headers: dict | None = None):
    req = urllib.request.Request(
        url,
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Content-Type": "application/json", **(headers or {})},
    )
    try:
        with urllib.request.urlopen(req) as res:
            return res.status, json.load(res)
    except urllib.error.HTTPError as err:
        return err.code, json.load(err)


def test_lists_sources(api) -> None:
    base, _ = api
    status, body = call(f"{base}/api/sources")
    assert status == 200
    assert "osm" in {s["name"] for s in body["items"]}


def test_rejects_unknown_source_and_foreign_origin(api) -> None:
    base, _ = api
    assert call(f"{base}/api/jobs", "POST", {"source": "nope"})[0] == 400
    status, _ = call(f"{base}/api/sources", headers={"Origin": "https://evil.example"})
    assert status == 403


def test_job_runs_dry_plan_and_blocks_second_job(api) -> None:
    base, manager = api
    # dry plan is not exposed; run a real step that fails fast offline-safe: unknown flag
    status, job = call(f"{base}/api/jobs", "POST", {"source": "all", "export": False})
    assert status == 202
    assert call(f"{base}/api/jobs", "POST", {"source": "osm"})[0] == 409
    manager.cancel(manager.get(job["id"]))
    for _ in range(100):
        _, current = call(f"{base}/api/jobs/{job['id']}")
        if current["status"] != "running":
            break
        time.sleep(0.1)
    assert current["status"] in {"cancelled", "succeeded", "failed"}
