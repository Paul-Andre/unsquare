"""Recenter and re-pad a level around the support of its solution.

Many generators produce content that is glued against the top-left of the
grid even though the grid has spare white rows/columns -- the puzzle is
not centred. Some generators also produce levels that are *tight* against
the grid edges, while the human-curated daily corpus tends to leave a
small white border about half the time.

This module fixes both. Given a level and one of its solutions, it:

  1. computes the *support bounding box* of the solution (which is the
     smallest rectangle that contains every black cell *and* every cell
     touched by an op in the solution -- so cropping to it provably
     preserves the level and the solution),
  2. crops the level down to that bbox (the "tight" form),
  3. picks a padding amount from a configurable distribution,
  4. places the cropped form back onto a (typically square) grid with
     the padding split as evenly as possible between top/bottom and
     left/right, and re-maps the solution to the new grid's op ordering.

The output may end up larger *or* smaller than the input. That is
intentional and the caller should accept that the level distribution
will no longer match the original ``--sizes`` pool exactly.

Padding-distribution learning
-----------------------------

The default distribution is derived from the live daily-levels corpus
(see :func:`derive_padding_distribution`): about 1/3 of levels have no
padding, ~1/2 sit on a square grid with two extra rows/columns, and a
small tail goes up to P=5. Pass ``--padding none`` (a one-shot ``P=0``
distribution) or an explicit ``"0:0.5,1:0.3,2:0.2"`` to override.

Par preservation
----------------

The recorded solution still solves the new level by construction. In
principle, additional padding may *expand* the op-set enough that an
even shorter solution exists; in practice this is very rare. We leave
``par`` and ``par_is_optimal`` as-is (recorded from the pre-padding
optimisation pass) so the caller does not pay for a second par solve
per candidate.
"""

from __future__ import annotations

import json
import random
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

from .dedup import crop_to_bbox, packed_solution_from_list, support_bbox
from .geometry import enumerate_moves, int_to_tiles, tiles_to_int


# ----------------------------------------------------------------------
# Padding distribution
# ----------------------------------------------------------------------


@dataclass
class PaddingDistribution:
    """Discrete distribution over non-negative padding amounts ``P``.

    ``P`` is the *extra* padding added to the wider dimension after
    cropping. The final grid side length becomes ``max(W, H) + P``.
    """

    weights: List[Tuple[int, float]]

    def sample(self, rng: random.Random) -> int:
        total = sum(w for _, w in self.weights)
        if total <= 0:
            return 0
        r = rng.random() * total
        acc = 0.0
        for amt, w in self.weights:
            acc += w
            if r < acc:
                return amt
        return self.weights[-1][0]

    @classmethod
    def constant(cls, p: int) -> "PaddingDistribution":
        return cls([(int(p), 1.0)])

    @classmethod
    def from_spec(cls, spec: str) -> "PaddingDistribution":
        """Parse a ``"amount:weight,amount:weight,..."`` string.

        Special tokens: ``"none"`` -> ``constant(0)``; ``"auto"`` is *not*
        handled here (the caller resolves it via
        :func:`derive_padding_distribution`).
        """
        s = spec.strip().lower()
        if s in ("none", "0"):
            return cls.constant(0)
        weights: List[Tuple[int, float]] = []
        for piece in s.split(","):
            piece = piece.strip()
            if not piece:
                continue
            if ":" in piece:
                amt_s, w_s = piece.split(":", 1)
                amt = int(amt_s.strip())
                w = float(w_s.strip())
            else:
                amt = int(piece)
                w = 1.0
            if amt < 0 or w < 0:
                raise ValueError(f"invalid padding spec entry: {piece!r}")
            weights.append((amt, w))
        if not weights:
            raise ValueError(f"empty padding spec: {spec!r}")
        return cls(weights)

    def as_dict(self) -> Dict[str, float]:
        return {str(a): round(w, 4) for a, w in self.weights}


# Default distribution, fit to web/public/api/v1/daily_levels_book.json
# (150 levels, square grids only).  Histogram of the wider-axis padding:
#   0: 50, 1: 14, 2: 72, 3: 7, 4: 6, 5: 1
DEFAULT_PADDING = PaddingDistribution(
    [(0, 50), (1, 14), (2, 72), (3, 7), (4, 6), (5, 1)]
)


def derive_padding_distribution(
    paths: Iterable[Path],
    *,
    cap: int = 6,
) -> Optional[PaddingDistribution]:
    """Derive a :class:`PaddingDistribution` from a corpus of books.

    Each level's recorded first solution defines its support bbox; the
    "padding amount" is ``max(w - bbox_w, h - bbox_h)``. Counts above
    ``cap`` are merged into the ``cap`` bucket. Returns ``None`` if no
    usable levels are found.
    """
    hist: Dict[int, int] = {}
    seen = 0
    for p in paths:
        try:
            with open(p) as f:
                book = json.load(f)
        except (OSError, json.JSONDecodeError):
            continue
        levels = book.get("levels") if isinstance(book, dict) else book
        if not isinstance(levels, list):
            continue
        for lvl in levels:
            if not isinstance(lvl, dict):
                continue
            tiles = lvl.get("tiles")
            sols = lvl.get("solutions")
            if not tiles or not isinstance(sols, list) or not sols:
                continue
            try:
                bits, w, h = tiles_to_int(tiles)
            except (ValueError, TypeError):
                continue
            sol0 = sols[0]
            if not isinstance(sol0, list):
                continue
            try:
                sol_bits = packed_solution_from_list(sol0)
            except (ValueError, TypeError):
                continue
            bbox = support_bbox(sol_bits, w, h)
            if bbox is None:
                continue
            minx, miny, maxx, maxy = bbox
            W = maxx - minx + 1
            H = maxy - miny + 1
            pad = max(w - W, h - H)
            if pad < 0:
                continue
            pad = min(pad, cap)
            hist[pad] = hist.get(pad, 0) + 1
            seen += 1
    if seen == 0 or not hist:
        return None
    weights = sorted(hist.items())
    return PaddingDistribution([(int(a), float(c)) for a, c in weights])


# ----------------------------------------------------------------------
# The transformation itself
# ----------------------------------------------------------------------


@dataclass
class RecenterResult:
    tiles: List[List[int]]
    solution: List[int]
    width: int
    height: int
    info: Dict[str, Any]


def recenter_and_pad(
    tiles: List[List[int]],
    solution: List[int],
    *,
    distribution: PaddingDistribution = DEFAULT_PADDING,
    square: bool = True,
    rng: Optional[random.Random] = None,
) -> RecenterResult:
    """Crop ``tiles`` to its solution's support bbox, then re-pad and centre.

    The returned solution is re-mapped to the new grid's op enumeration
    so that calling :func:`apply_solution` on it reproduces ``new_tiles``.

    The grid may grow or shrink. If ``square`` is True the output is
    forced square (``side = max(W, H) + P``); otherwise both axes get
    ``P`` extra cells.

    No-ops gracefully when:
      * the solution is empty (all-white level),
      * the input has zero black cells,
      * the bounding box already exactly equals the grid AND no padding
        is sampled (then the level is returned untouched).
    """
    rng = rng or random.Random()
    bits, w, h = tiles_to_int(tiles)
    info: Dict[str, Any] = {"input_size": (w, h)}

    if not solution or all(s == 0 for s in solution):
        info["skipped"] = "no_solution"
        return RecenterResult(tiles=tiles, solution=list(solution), width=w, height=h, info=info)

    sol_bits = packed_solution_from_list(solution)
    bbox = support_bbox(sol_bits, w, h)
    if bbox is None:
        info["skipped"] = "empty_support"
        return RecenterResult(tiles=tiles, solution=list(solution), width=w, height=h, info=info)

    minx, miny, maxx, maxy = bbox
    W = maxx - minx + 1
    H = maxy - miny + 1
    cropped_bits, _, _ = crop_to_bbox(bits, w, h, bbox)

    P = distribution.sample(rng)
    if square:
        side = max(W, H) + P
        new_w = side
        new_h = side
    else:
        new_w = W + P
        new_h = H + P

    pad_h_total = new_w - W
    pad_v_total = new_h - H

    def split(total: int) -> Tuple[int, int]:
        a = total // 2
        b = total - a
        # If odd, randomise which side gets the extra cell so we don't
        # systematically bias content towards top-left.
        if (total % 2) == 1 and rng.random() < 0.5:
            a, b = b, a
        return a, b

    p_l, p_r = split(pad_h_total)
    p_t, p_b = split(pad_v_total)

    # Quick exit: if the new grid equals the input and the content is
    # already in the correct slot, the transformation is a no-op.
    if new_w == w and new_h == h and p_l == minx and p_t == miny:
        info.update({
            "tight_size": (W, H),
            "output_size": (new_w, new_h),
            "padding": [p_l, p_r, p_t, p_b],
            "pad_amount": P,
            "transformed": False,
        })
        return RecenterResult(tiles=tiles, solution=list(solution), width=w, height=h, info=info)

    new_bits = 0
    for y in range(H):
        for x in range(W):
            if (cropped_bits >> (x + y * W)) & 1:
                nx = x + p_l
                ny = y + p_t
                new_bits |= 1 << (nx + ny * new_w)
    new_tiles = int_to_tiles(new_bits, new_w, new_h)

    old_moves = enumerate_moves(w, h)
    new_moves = enumerate_moves(new_w, new_h)
    new_idx = {(m.x, m.y, m.size): i for i, m in enumerate(new_moves)}
    new_sol = [0] * len(new_moves)
    for i, b in enumerate(solution):
        if not b:
            continue
        m = old_moves[i]
        nx = m.x - minx + p_l
        ny = m.y - miny + p_t
        key = (nx, ny, m.size)
        if key not in new_idx:
            # Should never happen if the bbox is correct, but guard
            # anyway. Refuse the transform.
            info["skipped"] = "move_out_of_bounds"
            return RecenterResult(tiles=tiles, solution=list(solution), width=w, height=h, info=info)
        new_sol[new_idx[key]] = 1

    info.update({
        "tight_size": (W, H),
        "output_size": (new_w, new_h),
        "padding": [p_l, p_r, p_t, p_b],
        "pad_amount": P,
        "transformed": True,
    })
    return RecenterResult(tiles=new_tiles, solution=new_sol, width=new_w, height=new_h, info=info)


__all__ = [
    "PaddingDistribution",
    "DEFAULT_PADDING",
    "derive_padding_distribution",
    "RecenterResult",
    "recenter_and_pad",
]
