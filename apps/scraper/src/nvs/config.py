from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

APP_DIR = Path(__file__).resolve().parents[2]
CONFIG_PATH = APP_DIR / "config" / "sources.yaml"


class Settings:
    def __init__(self, data: dict[str, Any], config_path: Path = CONFIG_PATH) -> None:
        self.data = data
        self.config_path = config_path
        http = data.get("http", {})
        paths = data.get("paths", {})
        self.user_agent: str = http.get(
            "user_agent", "NepalVerseScraper/0.1 (+https://nepalverse.example)"
        )
        self.timeout_s: float = float(http.get("timeout_s", 30.0))
        self.default_rate_limit_rps: float = float(http.get("default_rate_limit_rps", 1.0))
        self.raw_dir: Path = APP_DIR / paths.get("raw_dir", "raw")
        self.export_dir: Path = (APP_DIR / paths.get("export_dir", "export")).resolve()
        self.sources: dict[str, dict[str, Any]] = dict(data.get("sources", {}))

    def source(self, name: str) -> dict[str, Any]:
        if name not in self.sources:
            raise KeyError(f"unknown source: {name}")
        return self.sources[name]

    def enabled_sources(self) -> list[str]:
        return [name for name, cfg in self.sources.items() if cfg.get("enabled", False)]

    def rate_limit_rps(self, name: str) -> float:
        cfg = self.sources.get(name, {})
        return float(cfg.get("rate_limit_rps", self.default_rate_limit_rps))


def load_settings(path: Path | None = None) -> Settings:
    config_path = path or CONFIG_PATH
    with config_path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle) or {}
    return Settings(data, config_path)
