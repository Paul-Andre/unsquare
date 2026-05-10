"""Cropping-aware deduplication.

A level on grid ``(w, h)`` may have all-white border rows/columns that are
not actually part of the puzzle: the same pattern, padded differently or
on a different size grid, plays the same. To detect such "padded twins"
we crop each level down to the **support bounding box of one of its
par-optimal solutions** and compute a canonical key from that.

Why solution-support and not just the bounding box of black cells? If
some par-optimal solution uses an op that extends beyond the black bbox
(e.g. a 4x4 stamp whose lower-right corner lies in the white border),
cropping to the black bbox would lose access to that op and the cropped
level would have a *different* (larger) par. Using the solution support
is correct: the same operations are still available after the crop, so
par is provably preserved.

A level may also have *several* par-optimal solutions whose support boxes
do not nest inside each other. In that case the level has multiple valid
"tight" representatives. We collect a canonical key for each one; two
levels are equivalents iff their key sets intersect.

The canonical key here delegates to :func:`canonical_full_key`, which
already absorbs the 8 D4 symmetries (including transposes that swap
shape) and the colour-complement.

Public API:
  * :func:`support_bbox` : bbox of cells covered by a packed solution.
  * :func:`crop_to_bbox` : restrict a packed pattern to a sub-rectangle.
  * :func:`level_canonical_keys` : the set of canonical keys for one
    level given its packed par-optimal solutions.
"""

from __future__ import annotations

from typing import Iterable, List, Optional, Set, Tuple

from .canonical import canonical_full_key
from .geometry import enumerate_moves, num_operations


# The blank level (zero black cells) has an empty solution and an empty
# bbox. Treat it as its own equivalence class so the all-white grid is
# not silently identified with anything else.
BLANK_KEY: Tuple = ("__blank__",)


def support_bbox(
    solution_bits: int,
    w: int,
    h: int,
) -> Optional[Tuple[int, int, int, int]]:
    """Return ``(minx, miny, maxx, maxy)`` of the union of op supports.

    ``solution_bits`` is a bit-packed selection of ops in
    :func:`enumerate_moves` order. Returns ``None`` if no ops are
    selected (i.e. the empty / "do nothing" solution).
    """
    if solution_bits == 0:
        return None
    moves = enumerate_moves(w, h)
    minx = w
    miny = h
    maxx = -1
    maxy = -1
    for i, m in enumerate(moves):
        if not ((solution_bits >> i) & 1):
            continue
        if m.x < minx:
            minx = m.x
        if m.y < miny:
            miny = m.y
        x2 = m.x + m.size - 1
        y2 = m.y + m.size - 1
        if x2 > maxx:
            maxx = x2
        if y2 > maxy:
            maxy = y2
    if maxx < 0:
        return None
    return minx, miny, maxx, maxy


def crop_to_bbox(
    bits: int,
    w: int,
    h: int,
    bbox: Tuple[int, int, int, int],
) -> Tuple[int, int, int]:
    """Return ``(cropped_bits, w', h')`` restricted to ``bbox``.

    Bits outside the bbox are discarded; bits inside are repositioned so
    that the bbox's top-left corner becomes ``(0, 0)``.
    """
    minx, miny, maxx, maxy = bbox
    new_w = maxx - minx + 1
    new_h = maxy - miny + 1
    out = 0
    for y in range(miny, maxy + 1):
        for x in range(minx, maxx + 1):
            if (bits >> (x + y * w)) & 1:
                out |= 1 << ((x - minx) + (y - miny) * new_w)
    return out, new_w, new_h


def level_canonical_keys(
    bits: int,
    w: int,
    h: int,
    par_solutions: Iterable[int],
) -> Set[Tuple[int, int, int]]:
    """Set of canonical keys covering all valid tight crops of the level.

    For each solution in ``par_solutions`` (as bit-packed selections of
    ops), crop the level to that solution's support bbox and compute the
    full canonical key (8 D4 symmetries + colour-complement). The
    resulting set is the level's "fingerprint" for dedup: two levels are
    equivalent under crop+symmetry+complement iff their fingerprint sets
    intersect.

    If no solutions are supplied **and** the level has at least one black
    cell, the level cannot be cropped meaningfully and we fall back to
    the un-cropped canonical key (so the level is still deduplicated
    against itself even when solutions are missing).
    """
    keys: Set[Tuple[int, int, int]] = set()
    has_solution = False
    for sol_bits in par_solutions:
        bbox = support_bbox(sol_bits, w, h)
        if bbox is None:
            # par == 0: blank level.
            keys.add(BLANK_KEY)
            has_solution = True
            continue
        cropped, cw, ch = crop_to_bbox(bits, w, h, bbox)
        if cropped == 0:
            # Defensive: solution is non-empty but the crop is blank
            # (shouldn't happen if solution actually solves the level).
            keys.add(BLANK_KEY)
        else:
            keys.add(canonical_full_key(cropped, cw, ch))
        has_solution = True
    if not has_solution:
        # Fallback: no solutions available; treat the whole grid as the
        # canonical form. Worse dedup quality but still correct.
        if bits == 0:
            keys.add(BLANK_KEY)
        else:
            keys.add(canonical_full_key(bits, w, h))
    return keys


def packed_solution_from_list(solution: List[int]) -> int:
    """Convert a 0/1 list (game-style solution vector) into bit-packed int."""
    out = 0
    for i, b in enumerate(solution):
        if b:
            out |= 1 << i
    return out


def keys_for_level_from_record(
    bits: int,
    w: int,
    h: int,
    *,
    recorded_solutions: Optional[List[List[int]]] = None,
    fallback_solver=None,
) -> Set[Tuple[int, int, int]]:
    """Compute the canonical-key set for a corpus or candidate level.

    * If ``recorded_solutions`` is non-empty, use those (each as a 0/1
      list of length ``num_operations(w, h)``).
    * Else if ``fallback_solver`` is given, call it as
      ``fallback_solver(w, h, bits)`` to produce one
      ``(par, solution_bits)`` tuple. The solver should return ``None``
      for unreachable levels.
    * Else fall back to the un-cropped canonical key.
    """
    par_sols: List[int] = []
    if recorded_solutions:
        m = num_operations(w, h)
        for sol in recorded_solutions:
            if not isinstance(sol, list):
                continue
            if any(b not in (0, 1) for b in sol):
                continue
            if len(sol) != m:
                # Out-of-spec solution length; skip.
                continue
            par_sols.append(packed_solution_from_list(sol))
    if not par_sols and fallback_solver is not None:
        result = fallback_solver(w, h, bits)
        if result is not None:
            par_sols.append(result)
    return level_canonical_keys(bits, w, h, par_sols)


__all__ = [
    "BLANK_KEY",
    "support_bbox",
    "crop_to_bbox",
    "level_canonical_keys",
    "packed_solution_from_list",
    "keys_for_level_from_record",
]
