"""Collect canonical keys for every "existing" level in the project.

The generator must avoid producing levels that are duplicates (under
symmetry/colour-complement) of any level the user already has -- main
campaign, daily, weekly, or any editor book. This module enumerates those
sources and returns a single set of canonical keys to test against.

By default it scans:

  * ``web/public/api/v1/daily_levels_book.json``  (the live daily book)
  * ``web/public/api/v1/weekly_challenges_book.json``
  * ``web/src/data/2025_nov_11_reordered_solved_fixed_all_solutions.json``
    (the live "main" book; declared in ``web/src/modules/core/loadBook.ts``)
  * ``all_editor_books_2026_march_04.json``       (the editor-books archive)
  * any ``daily_levels_*solved*.json`` / ``daily_*.json`` under ``Solver/``
  * additional paths supplied explicitly.

Each path is best-effort: missing files are skipped silently with a note.
"""

from __future__ import annotations

import glob
import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Set, Tuple

from .book import iter_book_levels
from .canonical import canonical_full_key


REPO_ROOT = Path(__file__).resolve().parents[2]


DEFAULT_SOURCES: Tuple[str, ...] = (
    "web/public/api/v1/daily_levels_book.json",
    "web/public/api/v1/weekly_challenges_book.json",
    "web/src/data/2025_nov_11_reordered_solved_fixed_all_solutions.json",
    "web/src/data/dailyLevels.json",
    "all_editor_books_2026_march_04.json",
)

DEFAULT_SOURCE_GLOBS: Tuple[str, ...] = (
    "Solver/daily_*.json",
    "web/src/data/daily_*.json",
    "web/src/data/2025_*solved*.json",
    "web/src/data/niceLevels*.json",
    "web/src/data/2024_feb_*.json",
    "web/src/data/2023_sept_*.json",
    "web/src/data/basicBlackWhite.json",
    "web/src/data/book1Old.json",
)


@dataclass
class ExistingCorpus:
    keys: Set[Tuple[int, int, int]]
    file_count: int
    level_count: int
    by_source: Dict[str, int]

    def __contains__(self, key: Tuple[int, int, int]) -> bool:
        return key in self.keys


def _read_json(path: Path) -> Optional[object]:
    try:
        with open(path, "r") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return None


def _extract_levels(json_obj: object) -> Iterable[dict]:
    """Return all level-like objects from a parsed JSON.

    Accepts: a list of books, a single book object, a list of levels, or a
    bare level. Ignores anything else.
    """
    if json_obj is None:
        return []
    if isinstance(json_obj, list):
        out: List[dict] = []
        for item in json_obj:
            if isinstance(item, dict) and "levels" in item:
                out.extend(iter_book_levels(item))
            elif isinstance(item, dict) and item.get("__type__") == "Level":
                out.append(item)
        if out:
            return out
        # Old format: list of levels.
        return [x for x in json_obj if isinstance(x, dict)]
    if isinstance(json_obj, dict):
        if "levels" in json_obj:
            return iter_book_levels(json_obj)
        if json_obj.get("__type__") == "Level":
            return [json_obj]
    return []


def collect_existing_keys(
    *,
    repo_root: Path = REPO_ROOT,
    extra_paths: Optional[Iterable[str]] = None,
    extra_globs: Optional[Iterable[str]] = None,
    verbose: bool = False,
) -> ExistingCorpus:
    """Walk the project for existing levels and produce their canonical keys."""
    paths: List[Path] = []
    seen_paths: Set[Path] = set()

    def add(p: Path) -> None:
        rp = p.resolve()
        if rp in seen_paths:
            return
        seen_paths.add(rp)
        paths.append(p)

    for rel in DEFAULT_SOURCES:
        add(repo_root / rel)
    for pat in DEFAULT_SOURCE_GLOBS:
        for hit in glob.glob(str(repo_root / pat)):
            add(Path(hit))
    for rel in extra_paths or ():
        add(Path(rel) if os.path.isabs(rel) else repo_root / rel)
    for pat in extra_globs or ():
        for hit in glob.glob(pat if os.path.isabs(pat) else str(repo_root / pat)):
            add(Path(hit))

    keys: Set[Tuple[int, int, int]] = set()
    by_source: Dict[str, int] = {}
    file_count = 0
    level_count = 0

    for p in paths:
        if not p.exists():
            if verbose:
                print(f"  [skip] {p} (missing)")
            continue
        data = _read_json(p)
        if data is None:
            if verbose:
                print(f"  [skip] {p} (unreadable)")
            continue
        added = 0
        for lvl in _extract_levels(data):
            tiles = lvl.get("tiles") if isinstance(lvl, dict) else None
            if not tiles:
                continue
            try:
                from .geometry import tiles_to_int
                bits, w, h = tiles_to_int(tiles)
            except (ValueError, TypeError):
                continue
            if w == 0 or h == 0:
                continue
            keys.add(canonical_full_key(bits, w, h))
            added += 1
        if added:
            file_count += 1
            level_count += added
            try:
                rel = str(p.relative_to(repo_root))
            except ValueError:
                rel = str(p)
            by_source[rel] = added
            if verbose:
                print(f"  [load] {rel}: {added} levels")
    return ExistingCorpus(
        keys=keys,
        file_count=file_count,
        level_count=level_count,
        by_source=by_source,
    )
