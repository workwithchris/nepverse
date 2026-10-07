from __future__ import annotations

from nvs.sources.elevation import elevation_gain, sample_points


def test_sample_points_caps_length() -> None:
    geometry = [[27.0 + i * 0.001, 85.0] for i in range(250)]
    sampled = sample_points(geometry, limit=100)
    assert len(sampled) == 100
    assert sampled[0] == geometry[0]


def test_sample_points_passthrough_when_small() -> None:
    geometry = [[27.0, 85.0], [27.1, 85.1]]
    assert sample_points(geometry, limit=100) == geometry


def test_elevation_gain_counts_positive_deltas_only() -> None:
    assert elevation_gain([1000, 1050, 1040, 1120]) == 130


def test_elevation_gain_ignores_noise() -> None:
    assert elevation_gain([1000, 1003, 1002, 1004]) == 0


def test_elevation_gain_empty() -> None:
    assert elevation_gain([]) == 0
