from __future__ import annotations

import time
from collections.abc import Iterator
from typing import Any, Protocol

import httpx
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from nvs.config import Settings, load_settings
from nvs.core.models import SourceRecord

DEFAULT_USER_AGENT = "NepalVerseScraper/0.1 (+https://nepalverse.example; contact@example.com)"


class PoliteClient:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or load_settings()
        self._last_hit: dict[str, float] = {}
        self._limits: dict[str, float] = {}
        self._client = httpx.Client(
            headers={"User-Agent": self.settings.user_agent},
            timeout=self.settings.timeout_s,
            follow_redirects=True,
        )

    def set_rate_limit(self, domain: str, rps: float) -> None:
        self._limits[domain] = max(rps, 0.01)

    def _throttle(self, domain: str) -> None:
        rps = self._limits.get(domain, self.settings.default_rate_limit_rps)
        min_interval = 1.0 / max(rps, 0.01)
        now = time.monotonic()
        last = self._last_hit.get(domain)
        if last is not None:
            wait_for = min_interval - (now - last)
            if wait_for > 0:
                time.sleep(wait_for)
        self._last_hit[domain] = time.monotonic()

    @retry(
        retry=retry_if_exception_type((httpx.TransportError, httpx.TimeoutException)),
        stop=stop_after_attempt(4),
        wait=wait_exponential(multiplier=1, min=1, max=20),
        reraise=True,
    )
    def get(self, url: str, *, params: dict[str, Any] | None = None) -> httpx.Response:
        domain = httpx.URL(url).host or ""
        self._throttle(domain)
        response = self._client.get(url, params=params)
        response.raise_for_status()
        return response

    @retry(
        retry=retry_if_exception_type((httpx.TransportError, httpx.TimeoutException)),
        stop=stop_after_attempt(4),
        wait=wait_exponential(multiplier=1, min=1, max=20),
        reraise=True,
    )
    def post(self, url: str, *, data: dict[str, Any] | None = None) -> httpx.Response:
        domain = httpx.URL(url).host or ""
        self._throttle(domain)
        response = self._client.post(url, data=data)
        response.raise_for_status()
        return response

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> PoliteClient:
        return self

    def __exit__(self, *args: object) -> None:
        self.close()


class BaseSource(Protocol):
    name: str
    license: str
    attribution: str

    def fetch(self) -> Iterator[SourceRecord]: ...

    def plan(self) -> list[str]: ...


class SourceBase:
    name = "base"
    license = ""
    attribution = ""

    def __init__(self, settings: Settings | None = None, client: PoliteClient | None = None) -> None:
        self.settings = settings or load_settings()
        self.client = client or PoliteClient(self.settings)
        cfg = self.settings.sources.get(self.name, {})
        self.license = cfg.get("license", self.license)
        self.attribution = cfg.get("attribution", self.attribution)
        self.endpoints: dict[str, str] = dict(cfg.get("endpoints", {}))

    def fetch(self) -> Iterator[SourceRecord]:
        raise NotImplementedError(f"M1: {self.name} fetch() is not implemented yet")

    def plan(self) -> list[str]:
        return []
