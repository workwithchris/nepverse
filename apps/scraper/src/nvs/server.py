"""Local job API so the web viewer can trigger scraper runs.

Stdlib only. Binds to localhost, runs one job at a time and refuses
cross-site browser requests. Not meant to be exposed to a network.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import threading
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import parse_qs, urlparse

from nvs.cli import SOURCE_CHOICES
from nvs.config import load_settings

MAX_LOG_LINES = 5000
MAX_JOBS = 20
LOCAL_ORIGIN = re.compile(r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$")


def _now() -> str:
    return datetime.now(UTC).isoformat()


@dataclass
class Job:
    id: str
    source: str
    export: bool
    dedupe: bool
    status: str = "queued"  # queued | running | succeeded | failed | cancelled
    step: str = ""
    created_at: str = field(default_factory=_now)
    started_at: str | None = None
    finished_at: str | None = None
    log: list[str] = field(default_factory=list)
    proc: subprocess.Popen[str] | None = field(default=None, repr=False)

    def summary(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "source": self.source,
            "export": self.export,
            "dedupe": self.dedupe,
            "status": self.status,
            "step": self.step,
            "createdAt": self.created_at,
            "startedAt": self.started_at,
            "finishedAt": self.finished_at,
            "logLength": len(self.log),
        }


class JobManager:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._jobs: dict[str, Job] = {}

    def active(self) -> Job | None:
        return next((j for j in self._jobs.values() if j.status in ("queued", "running")), None)

    def start(self, source: str, export: bool, dedupe: bool) -> Job:
        with self._lock:
            if self.active():
                raise RuntimeError("a job is already running")
            job = Job(uuid.uuid4().hex[:10], source, export, dedupe)
            self._jobs[job.id] = job
            for old in list(self._jobs)[:-MAX_JOBS]:
                del self._jobs[old]
        threading.Thread(target=self._run, args=(job,), daemon=True).start()
        return job

    def get(self, job_id: str) -> Job | None:
        return self._jobs.get(job_id)

    def recent(self) -> list[Job]:
        return list(self._jobs.values())[::-1]

    def cancel(self, job: Job) -> None:
        if job.status == "running":
            job.status = "cancelled"
            if job.proc:
                job.proc.terminate()

    def _steps(self, job: Job) -> list[tuple[str, list[str]]]:
        base = [sys.executable, "-m", "nvs"]
        steps = [(f"Scrape {job.source}", [*base, "run", "--source", job.source])]
        if job.export:
            export = [*base, "export"]
            if not job.dedupe:
                export.append("--no-dedupe")
            steps.append(("Export to viewer", export))
        return steps

    def _append(self, job: Job, line: str) -> None:
        job.log.append(line.rstrip("\n"))
        if len(job.log) > MAX_LOG_LINES:
            del job.log[: len(job.log) - MAX_LOG_LINES]

    def _run(self, job: Job) -> None:
        job.status = "running"
        job.started_at = _now()
        env = {"PYTHONUNBUFFERED": "1", "PYTHONIOENCODING": "utf-8"}
        try:
            for label, cmd in self._steps(job):
                job.step = label
                self._append(job, f"$ {label}")
                job.proc = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    encoding="utf-8",
                    errors="replace",
                    env={**os.environ, **env},
                )
                assert job.proc.stdout is not None
                for line in job.proc.stdout:
                    self._append(job, line)
                code = job.proc.wait()
                if job.status == "cancelled":
                    self._append(job, "cancelled")
                    return
                if code != 0:
                    self._append(job, f"{label} failed (exit {code})")
                    job.status = "failed"
                    return
            job.status = "succeeded"
            job.step = "Done"
        except Exception as exc:  # noqa: BLE001 - surface any failure to the UI
            self._append(job, f"error: {exc}")
            job.status = "failed"
        finally:
            job.finished_at = _now()
            job.proc = None


def _sources() -> list[dict[str, Any]]:
    settings = load_settings()
    out = []
    for name in SOURCE_CHOICES:
        if name == "all":
            continue
        cfg = settings.sources.get(name, {})
        raw = settings.raw_dir / name
        files = sorted(raw.glob("*.jsonl")) if raw.exists() else []
        out.append(
            {
                "name": name,
                "enabled": bool(cfg.get("enabled", False)),
                "license": cfg.get("license"),
                "attribution": cfg.get("attribution"),
                "rateLimitRps": settings.rate_limit_rps(name),
                "rawFiles": len(files),
                "lastScraped": (
                    datetime.fromtimestamp(max(f.stat().st_mtime for f in files), UTC)
                    .isoformat()
                    if files
                    else None
                ),
            }
        )
    return out


def make_handler(manager: JobManager) -> type[BaseHTTPRequestHandler]:
    class Handler(BaseHTTPRequestHandler):
        server_version = "nvs-server"

        def log_message(self, format: str, *args: Any) -> None:  # noqa: A002
            return

        def _origin_ok(self) -> bool:
            origin = self.headers.get("Origin")
            return origin is None or bool(LOCAL_ORIGIN.match(origin))

        def _send(self, status: int, body: Any) -> None:
            data = json.dumps(body).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(data)

        def _body(self) -> dict[str, Any]:
            length = int(self.headers.get("Content-Length") or 0)
            if not length or length > 4096:
                return {}
            try:
                parsed = json.loads(self.rfile.read(length))
            except ValueError:
                return {}
            return parsed if isinstance(parsed, dict) else {}

        def do_GET(self) -> None:  # noqa: N802
            if not self._origin_ok():
                return self._send(403, {"error": "forbidden origin"})
            url = urlparse(self.path)
            parts = [p for p in url.path.split("/") if p]
            if parts == ["api", "health"]:
                return self._send(200, {"ok": True})
            if parts == ["api", "sources"]:
                return self._send(200, {"items": _sources()})
            if parts == ["api", "jobs"]:
                return self._send(200, {"items": [j.summary() for j in manager.recent()]})
            if len(parts) == 3 and parts[:2] == ["api", "jobs"]:
                job = manager.get(parts[2])
                if not job:
                    return self._send(404, {"error": "job not found"})
                since = int(parse_qs(url.query).get("since", ["0"])[0] or 0)
                return self._send(200, {**job.summary(), "log": job.log[max(since, 0) :]})
            self._send(404, {"error": "not found"})

        def do_POST(self) -> None:  # noqa: N802
            if not self._origin_ok():
                return self._send(403, {"error": "forbidden origin"})
            parts = [p for p in urlparse(self.path).path.split("/") if p]
            if parts == ["api", "jobs"]:
                body = self._body()
                source = body.get("source", "all")
                if source not in SOURCE_CHOICES:
                    return self._send(400, {"error": f"unknown source: {source}"})
                try:
                    job = manager.start(source, bool(body.get("export", True)), bool(body.get("dedupe", False)))
                except RuntimeError as exc:
                    return self._send(409, {"error": str(exc)})
                return self._send(202, job.summary())
            if len(parts) == 4 and parts[:2] == ["api", "jobs"] and parts[3] == "cancel":
                job = manager.get(parts[2])
                if not job:
                    return self._send(404, {"error": "job not found"})
                manager.cancel(job)
                return self._send(200, job.summary())
            self._send(404, {"error": "not found"})

    return Handler


def serve(host: str = "127.0.0.1", port: int = 8787) -> None:
    httpd = ThreadingHTTPServer((host, port), make_handler(JobManager()))
    print(f"nvs job API on http://{host}:{port}  (Ctrl+C to stop)", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()
