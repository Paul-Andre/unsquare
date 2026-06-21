#!/usr/bin/env python3
"""Merge Unsquare level book JSON files, with optional deduplication."""

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


def make_book_id() -> str:
    return f"book_{random.randint(0, MAX_SAFE_INTEGER)}"


def load_book(path: Path) -> dict[str, Any]:
    with path.open() as f:
        data = json.load(f)
    if isinstance(data, list):
        return {"levels": data}
    return data


def tiles_key(level: dict[str, Any]) -> str:
    return json.dumps(level.get("tiles"), separators=(",", ":"))


def book_display_title(book: dict[str, Any], path: Path) -> str:
    title = book.get("title")
    return title if title else path.name


def make_merged_title(
    books: list[dict[str, Any]], paths: list[Path], *, dedup: bool
) -> str:
    title = " + ".join(book_display_title(book, path) for book, path in zip(books, paths))
    if dedup:
        title += " (deduped)"
    return title


def reindex_levels(levels: list[dict[str, Any]]) -> None:
    for index, level in enumerate(levels):
        level["index"] = index


def merge_levels_strict(
    book_paths: list[tuple[Path, list[dict[str, Any]]]],
) -> list[dict[str, Any]]:
    """Concatenate levels in order, reindex, and warn about id problems."""
    merged: list[dict[str, Any]] = []
    seen_ids: set[str] = set()

    for book_path, levels in book_paths:
        for index, level in enumerate(levels):
            level = deepcopy(level)
            source = f"{book_path.name} level {index}"

            level_id = level.get("id")
            if not level_id:
                print(f"warning: {source}: missing id", file=sys.stderr)
            elif level_id in seen_ids:
                print(
                    f"warning: {source}: duplicate id {level_id}",
                    file=sys.stderr,
                )
            else:
                seen_ids.add(level_id)

            merged.append(level)

    reindex_levels(merged)
    return merged


def merge_levels_dedup(
    book_paths: list[tuple[Path, list[dict[str, Any]]]],
) -> tuple[list[dict[str, Any]], int]:
    """Merge levels applying (id, tiles) dedup and id sanitization."""
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

    reindex_levels(merged)
    return merged, duplicates_removed


def format_input_counts(counts: list[int]) -> str:
    return " + ".join(str(count) for count in counts)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Merge one or more level book JSON files."
    )
    parser.add_argument(
        "books",
        nargs="+",
        type=Path,
        help="Book JSON files to merge, in order",
    )
    parser.add_argument(
        "--dedup",
        action="store_true",
        help="Remove duplicate levels (same id and tiles) and fix id problems",
    )
    parser.add_argument(
        "-t",
        "--title",
        help="Title for the merged book (default: joined input titles)",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        help="Output file (default: stdout)",
    )
    args = parser.parse_args()

    loaded_books = [load_book(path) for path in args.books]
    level_counts = [len(book.get("levels", [])) for book in loaded_books]
    book_paths = [
        (path, book.get("levels", [])) for path, book in zip(args.books, loaded_books)
    ]

    if args.dedup:
        merged_levels, duplicates_removed = merge_levels_dedup(book_paths)
    else:
        merged_levels = merge_levels_strict(book_paths)
        duplicates_removed = 0

    output_book = deepcopy(loaded_books[0])
    output_book["id"] = make_book_id()
    output_book["title"] = args.title or make_merged_title(
        loaded_books, args.books, dedup=args.dedup
    )
    output_book["levels"] = merged_levels
    output_book.pop("source", None)

    output_json = json.dumps(output_book, indent=2)
    if args.output:
        args.output.write_text(output_json + "\n")
    else:
        print(output_json)

    summary = (
        f"Merged {format_input_counts(level_counts)} "
        f"→ {len(merged_levels)} levels"
    )
    if args.dedup:
        summary += f" ({duplicates_removed} duplicates removed)"
    print(summary, file=sys.stderr)


if __name__ == "__main__":
    main()
