"""Perturb generator: take a known-good level and apply small mutations.

For each mutation we pick the level (uniformly), copy its tile pattern,
and XOR-in 1-2 random operations. The resulting level is reachable by
construction and visually similar to the source -- useful as inspiration
or for filling out a near-by neighbourhood when you have a level you like
but need variations.

Source levels are loaded from book files (one or more paths). They are
filtered down to BW square levels of the requested sizes.
"""

from __future__ import annotations

import json
import random
from pathlib import Path
from typing import Iterator, List, Optional, Sequence, Tuple

from ..core.book import GeneratedLevel, iter_book_levels, load_book
from ..core.geometry import (
    enumerate_moves,
    int_to_tiles,
    operation_masks,
    tiles_to_int,
)


def _candidate_sources(
    sources: Sequence[str | Path],
    size_choices: Sequence[Tuple[int, int]],
) -> List[Tuple[int, int, int]]:
    """Return ``[(bits, w, h), ...]`` for every BW level in any of ``sources``
    matching one of the requested sizes."""
    allowed = set(size_choices)
    out: List[Tuple[int, int, int]] = []
    for src in sources:
        try:
            book = load_book(src)
        except (FileNotFoundError, json.JSONDecodeError):
            continue
        for lvl in iter_book_levels(book):
            if lvl.get("colorScheme") != "BW":
                continue
            if lvl.get("tileShape") != "square":
                continue
            tiles = lvl.get("tiles") or []
            if not tiles:
                continue
            try:
                bits, w, h = tiles_to_int(tiles)
            except (ValueError, TypeError):
                continue
            if (w, h) not in allowed:
                continue
            out.append((bits, w, h))
    return out


def generate_perturb(
    sources: Sequence[str | Path],
    size_choices: Sequence[Tuple[int, int]],
    *,
    n_candidates: int,
    mutations: int | Tuple[int, int] = (1, 2),
    rng: Optional[random.Random] = None,
) -> Iterator[GeneratedLevel]:
    rng = rng or random.Random()
    pool = _candidate_sources(sources, size_choices)
    if not pool:
        return
    for _ in range(n_candidates):
        bits, w, h = rng.choice(pool)
        moves = enumerate_moves(w, h)
        masks = operation_masks(w, h)
        m = len(masks)
        if isinstance(mutations, tuple):
            k = rng.randint(mutations[0], mutations[1])
        else:
            k = int(mutations)

        new_bits = bits
        applied: List[int] = []
        for _ in range(k):
            idx = rng.randrange(m)
            new_bits ^= masks[idx]
            applied.append(idx)
        if new_bits == 0 or new_bits == bits:
            continue

        # We don't have an easy solution for the new pattern (the source may
        # not have a solution stored, and even if it does, the perturbation
        # changes it). Leave it for the orchestrator to solve.
        tiles = int_to_tiles(new_bits, w, h)
        yield GeneratedLevel(
            tiles=tiles,
            par=None,
            solution=[],
            solution_type="running",
            width=w,
            height=h,
            metadata={"generator": "perturb", "mutations": k},
        )
