#!/usr/bin/env python3
"""Merge two Unsquare level book JSON files, deduplicating levels."""

from __future__ import annotations

import argparse
import json
import random
import sys
from copy import deepcopy
from pathlib import Path
from typing import Any


MAX_SAFE_INTEGER = 9007199254740991


def make_level_id() -> str:
    return f"level_{random.randint(0, MAX_SAFE_INTEGER)}"


def load_book(path: Path) -> dict[str, Any]:
    with path.open() as f:
        data = json.load(f)
    if isinstance(data, list):
        return {"levels": data}
    return data


def tiles_key(level: dict[str, Any]) -> str:
    return json.dumps(level.get("tiles"), separators=(",", ":"))


def merge_levels(
    book_paths: list[tuple[Path, list[dict[str, Any]]]],
) -> tuple[list[dict[str, Any]], int]:
    """Merge levels from multiple books in order, applying dedup rules.

    Dedup is keyed on (id, tiles): same pair → skip later copy.
    Same id but different tiles → keep both, rename the later one.
    Missing id → assign a new id.
    """
    merged: list[dict[str, Any]] = []
    seen_pairs: set[tuple[str, str]] = set()
    used_ids: set[str] = set()
    duplicates_removed = 0

    for book_path, levels in book_paths:
        for index, level in enumerate(levels):
            level = deepcopy(level)
            source = f"{book_path.name} level {index}"

            if not level.get("id"):
                level["id"] = make_level_id()
                print(
                    f"warning: {source}: missing id, assigned {level['id']}",
                    file=sys.stderr,
                )

            level_id = level["id"]
            key = tiles_key(level)

            if (level_id, key) in seen_pairs:
                duplicates_removed += 1
                continue

            if level_id in used_ids:
                old_id = level_id
                level["id"] = make_level_id()
                print(
                    f"warning: {source}: id collision {old_id} (tiles differ), "
                    f"assigned {level['id']}",
                    file=sys.stderr,
                )
                level_id = level["id"]
                key = tiles_key(level)

            merged.append(level)
            seen_pairs.add((level_id, key))
            used_ids.add(level_id)

    for index, level in enumerate(merged):
        level["index"] = index

    return merged, duplicates_removed


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Merge two level book JSON files, removing duplicate levels."
    )
    parser.add_argument("book1", type=Path, help="First book JSON file")
    parser.add_argument("book2", type=Path, help="Second book JSON file")
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        help="Output file (default: stdout)",
    )
    args = parser.parse_args()

    book1 = load_book(args.book1)
    book2 = load_book(args.book2)

    input_count = len(book1.get("levels", [])) + len(book2.get("levels", []))
    merged_levels, duplicates_removed = merge_levels(
        [
            (args.book1, book1.get("levels", [])),
            (args.book2, book2.get("levels", [])),
        ]
    )

    output_book = deepcopy(book1)
    output_book["levels"] = merged_levels

    output_json = json.dumps(output_book, indent=2)
    if args.output:
        args.output.write_text(output_json + "\n")
    else:
        print(output_json)

    print(
        f"Merged {len(book1.get('levels', []))} + {len(book2.get('levels', []))} "
        f"→ {len(merged_levels)} levels ({duplicates_removed} duplicates removed)",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
