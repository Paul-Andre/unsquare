"""Collect canonical keys for every "existing" level in the project.

The generator must avoid producing levels that are duplicates (under
symmetry, colour-complement and cropping) of any level the user already
has -- main campaign, daily, weekly, or any editor book. This module
enumerates those sources and returns a single set of canonical keys to
test against.

By default it scans:

  * ``web/public/api/v1/daily_levels_book.json``  (the live daily book)
  * ``web/public/api/v1/weekly_challenges_book.json``
  * ``web/src/data/2025_nov_11_reordered_solved_fixed_all_solutions.json``
    (the live "main" book; declared in ``web/src/modules/core/loadBook.ts``)
  * ``all_editor_books_2026_march_04.json``       (the editor-books archive)
  * any ``daily_levels_*solved*.json`` / ``daily_*.json`` under ``Solver/``
  * additional paths supplied explicitly.

Each path is best-effort: missing files are skipped silently with a note.

The dedup key is *crop-aware* (see :mod:`.dedup`): a level is
represented by the set of canonical keys of its tight-cropped variants
(one per par-optimal solution's support bounding box). Two levels are
considered equivalent iff their key-sets intersect. Because of that, the
"corpus index" returned by :func:`collect_existing_keys` is a flat
``set`` of all crop-aware keys: a candidate is a duplicate iff *any* of
its crop-aware keys is in this set.

To keep startup fast on large corpora the index is cached on disk in
``<repo>/level_generator/.dedup_cache.json`` and invalidated by hashing
the (path, mtime) pairs of the input files.
"""

from __future__ import annotations

import glob
import hashlib
import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Set, Tuple

from .book import iter_book_levels
from .canonical import canonical_full_key
from .dedup import BLANK_KEY, keys_for_level_from_record


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


# Bump this whenever the canonical-key algorithm changes so old caches
# are invalidated automatically.
_CACHE_SCHEMA_VERSION = 2

_CACHE_FILE = REPO_ROOT / "level_generator" / ".dedup_cache.json"


@dataclass
class ExistingCorpus:
    """Index of crop-aware canonical keys across the existing corpus."""

    keys: Set[Tuple]
    file_count: int
    level_count: int
    by_source: Dict[str, int]

    def __contains__(self, key) -> bool:
        return key in self.keys

    def matches_any(self, candidate_keys: Iterable[Tuple]) -> bool:
        """``True`` if any candidate key is already in the corpus."""
        for k in candidate_keys:
            if k in self.keys:
                return True
        return False


# ----------------------------------------------------------------------
# JSON-IO helpers
# ----------------------------------------------------------------------

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
        return [x for x in json_obj if isinstance(x, dict)]
    if isinstance(json_obj, dict):
        if "levels" in json_obj:
            return iter_book_levels(json_obj)
        if json_obj.get("__type__") == "Level":
            return [json_obj]
    return []


# ----------------------------------------------------------------------
# Cache (on-disk)
# ----------------------------------------------------------------------

def _files_fingerprint(paths: List[Path]) -> str:
    """A short hash of (relative path, mtime, size) for each existing path."""
    h = hashlib.sha256()
    for p in paths:
        try:
            st = p.stat()
            try:
                rel = str(p.resolve().relative_to(REPO_ROOT))
            except ValueError:
                rel = str(p.resolve())
            h.update(f"{rel}|{int(st.st_mtime)}|{st.st_size}\n".encode("utf-8"))
        except OSError:
            h.update(f"{p}|missing\n".encode("utf-8"))
    return h.hexdigest()


def _key_to_jsonable(k):
    """Serialise a canonical key as a JSON-safe list.

    Crop-aware keys are either ``BLANK_KEY`` (a 1-tuple sentinel) or a
    canonical_full_key tuple ``(w, h, bits)`` where ``bits`` may be a
    very large Python int. We store ``bits`` as a hex string.
    """
    if k == BLANK_KEY:
        return ["__blank__"]
    w, h, bits = k
    return [int(w), int(h), hex(bits)]


def _key_from_jsonable(lst):
    if len(lst) == 1 and lst[0] == "__blank__":
        return BLANK_KEY
    w, h, bits_hex = lst
    return (int(w), int(h), int(bits_hex, 16))


def _try_load_cache(paths: List[Path]) -> Optional[ExistingCorpus]:
    if not _CACHE_FILE.exists():
        return None
    try:
        with open(_CACHE_FILE) as f:
            data = json.load(f)
    except (json.JSONDecodeError, OSError):
        return None
    if not isinstance(data, dict):
        return None
    if data.get("schema") != _CACHE_SCHEMA_VERSION:
        return None
    if data.get("fingerprint") != _files_fingerprint(paths):
        return None
    try:
        keys = {_key_from_jsonable(item) for item in data["keys"]}
        by_source = {str(k): int(v) for k, v in data.get("by_source", {}).items()}
    except (KeyError, ValueError, TypeError):
        return None
    return ExistingCorpus(
        keys=keys,
        file_count=int(data.get("file_count", 0)),
        level_count=int(data.get("level_count", 0)),
        by_source=by_source,
    )


def _write_cache(corpus: ExistingCorpus, paths: List[Path]) -> None:
    try:
        _CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "schema": _CACHE_SCHEMA_VERSION,
            "fingerprint": _files_fingerprint(paths),
            "file_count": corpus.file_count,
            "level_count": corpus.level_count,
            "by_source": corpus.by_source,
            "keys": [_key_to_jsonable(k) for k in corpus.keys],
        }
        tmp = _CACHE_FILE.with_suffix(".tmp")
        with open(tmp, "w") as f:
            json.dump(payload, f)
        os.replace(tmp, _CACHE_FILE)
    except OSError:
        pass


# ----------------------------------------------------------------------
# Public API
# ----------------------------------------------------------------------

def collect_existing_keys(
    *,
    repo_root: Path = REPO_ROOT,
    extra_paths: Optional[Iterable[str]] = None,
    extra_globs: Optional[Iterable[str]] = None,
    use_cache: bool = True,
    verbose: bool = False,
) -> ExistingCorpus:
    """Walk the project for existing levels and produce their canonical keys.

    Returns an :class:`ExistingCorpus` whose ``keys`` is the *flat union*
    of crop-aware keys across every level (potentially several keys per
    level). To check whether a candidate level is a duplicate, compute
    the candidate's own crop-aware keys and call
    :meth:`ExistingCorpus.matches_any`.
    """
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

    # Only paths that actually exist contribute to the fingerprint cache.
    existing_paths = [p for p in paths if p.exists()]

    if use_cache:
        cached = _try_load_cache(existing_paths)
        if cached is not None:
            if verbose:
                print(
                    f"  [cache] loaded {len(cached.keys)} keys "
                    f"({cached.level_count} levels, {cached.file_count} files)"
                )
            return cached

    keys: Set[Tuple] = set()
    by_source: Dict[str, int] = {}
    file_count = 0
    level_count = 0

    # Local lazy import to avoid pulling solver deps on import.
    from .geometry import operation_masks, tiles_to_int
    from .linalg import solve_and_kernel, vec_to_bits
    from .par import _reduce_with_singletons

    def _solve_one(w: int, h: int, bits: int):
        """Cheap fallback: produce *any* valid solution for a corpus level.

        We don't need par-optimality here -- any solution gives a valid
        support bbox for cropping. solve_and_kernel + a single singleton
        descent runs in milliseconds even for big grids. The bbox may be
        slightly larger than the true minimum, costing a small amount of
        dedup tightness on legacy levels without recorded solutions, but
        keeping the index build under 30 seconds for ~5000 levels.
        """
        masks = operation_masks(w, h)
        res = solve_and_kernel(masks, w * h, bits)
        if res is None:
            return None
        sol_vec, kernel = res
        sol_bits = vec_to_bits(sol_vec)
        sol_bits, _ = _reduce_with_singletons(sol_bits, kernel)
        return sol_bits

    for p in existing_paths:
        data = _read_json(p)
        if data is None:
            if verbose:
                print(f"  [skip] {p} (unreadable)")
            continue
        added = 0
        for lvl in _extract_levels(data):
            if not isinstance(lvl, dict):
                continue
            tiles = lvl.get("tiles")
            if not tiles:
                continue
            try:
                bits, w, h = tiles_to_int(tiles)
            except (ValueError, TypeError):
                continue
            if w == 0 or h == 0:
                continue
            recorded_solutions = lvl.get("solutions") if isinstance(lvl.get("solutions"), list) else None
            level_keys = keys_for_level_from_record(
                bits, w, h,
                recorded_solutions=recorded_solutions,
                fallback_solver=_solve_one,
            )
            if not level_keys:
                # Unreachable / unparsable; fall back to plain canonical key.
                level_keys = {canonical_full_key(bits, w, h)}
            keys.update(level_keys)
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

    corpus = ExistingCorpus(
        keys=keys,
        file_count=file_count,
        level_count=level_count,
        by_source=by_source,
    )
    if use_cache:
        _write_cache(corpus, existing_paths)
    return corpus
