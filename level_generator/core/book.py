"""Read and write Unsquare *book* JSON files.

The on-disk format is a JSON object with a ``levels`` array. Each level is
an object with at least:

    {
      "colorScheme": "BW",
      "tileShape":   "square",
      "tiles":       [[1, 2, ...], ...],
      "par":         <int|null>,
      "isIcon":      <bool>,             # optional
      "index":       <int>,              # 0-based ordinal within the book
      "id":          "level_<random>",
      "solutions":   [[0, 1, ...], ...],
      "solutionType": "running" | "exhaustive" | ...,
      "__type__":    "Level"
    }

A book also carries metadata fields like ``id``, ``title``, ``startDate``,
``seqOffset``, ``source`` -- we propagate these on read/write.

This module produces output compatible with both the public daily-levels
file (``web/public/api/v1/daily_levels_book.json``) and the in-app books.
"""

from __future__ import annotations

import json
import os
import random
import string
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional


# --- Public constants & helpers -------------------------------------------

LEVEL_TYPE = "Level"
COLOR_SCHEME = "BW"
TILE_SHAPE = "square"


def _rand_digits(n: int = 16) -> str:
    return "".join(random.choices(string.digits, k=n))


def make_level_id() -> str:
    return f"level_{_rand_digits(16)}"


def make_book_id() -> str:
    return f"book_{_rand_digits(16)}"


# --- Domain types ---------------------------------------------------------

@dataclass
class GeneratedLevel:
    tiles: List[List[int]]            # 1=white, 2=black
    par: Optional[int]                # solution weight (best known)
    solution: List[int]               # one solution as 0/1 vector
    solution_type: str                # "running" | "optimal" | ...
    width: int
    height: int
    metadata: Dict[str, Any] = field(default_factory=dict)
    """Free-form per-level metadata for the generator UI / review pass.

    Common fields:
      * ``generator`` (str): name of the generator that produced this level.
      * ``generation_seed`` (int): RNG seed at the time of generation.
      * ``par_is_optimal`` (bool): True if ``par`` is provably optimal.
      * ``black_count`` (int): number of black tiles.
      * ``black_fraction`` (float): black_count / (width * height).
      * ``bbox_area_fraction`` (float): black bounding box area / total area.
      * ``score`` (float): aggregate quality score (higher is better).
    """

    def to_json(self, index: int, level_id: Optional[str] = None) -> Dict[str, Any]:
        out: Dict[str, Any] = {
            "colorScheme": COLOR_SCHEME,
            "tileShape": TILE_SHAPE,
            "tiles": self.tiles,
            "par": self.par,
            "index": index,
            "id": level_id or make_level_id(),
            "solutions": [list(self.solution)],
            "solutionType": self.solution_type,
            "__type__": LEVEL_TYPE,
        }
        # Non-essential annotations (generator, score, ...) are placed under
        # a "_gen" namespace so they don't clash with anything in the game
        # client (which ignores unknown keys).
        if self.metadata:
            out["_gen"] = dict(self.metadata)
        return out


# --- Read --------------------------------------------------------------

def load_book(path: str | os.PathLike) -> Dict[str, Any]:
    """Load a single book file (object or array form)."""
    with open(path, "r") as f:
        data = json.load(f)
    if isinstance(data, list):
        # Old-style: bare list of levels.
        return {"levels": data}
    return data


def iter_book_levels(book_data: Dict[str, Any]) -> Iterable[Dict[str, Any]]:
    return list(book_data.get("levels", []))


# --- Write --------------------------------------------------------------

def write_book(
    levels: List[GeneratedLevel],
    output_path: str | os.PathLike,
    *,
    title: str = "Generated levels",
    book_id: Optional[str] = None,
    extra_meta: Optional[Dict[str, Any]] = None,
    icon_index: int = 0,
    pretty: bool = False,
) -> Dict[str, Any]:
    """Serialise ``levels`` as an Unsquare book JSON file.

    ``icon_index`` is set as ``isIcon: true`` on that level (typically the
    visually most-iconic one). Pass a negative value to omit.
    """
    json_levels: List[Dict[str, Any]] = []
    for i, lvl in enumerate(levels):
        obj = lvl.to_json(index=i)
        if i == icon_index:
            obj["isIcon"] = True
        json_levels.append(obj)
    book = {
        "id": book_id or make_book_id(),
        "title": title,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "levels": json_levels,
    }
    if extra_meta:
        book.update(extra_meta)

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        if pretty:
            json.dump(book, f, indent=2)
        else:
            json.dump(book, f, separators=(",", ":"))
    return book
