"""Motif-mosaic generator: combine hand-curated visual primitives.

A *motif* is a small named pattern (e.g. "plus_sign", "frame", "diamond",
"L_shape") that can be placed at various positions/scales on a larger
grid. The generator picks one or two motifs and overlays them via XOR.

Crucially, every motif is itself constructible as a XOR of square ops, so
the resulting target is automatically reachable. The motif set is a free
mathematical playground -- you can extend it without affecting any other
file.

The motifs are described as combinations of *moves* (square stamps), so
each motif inherently comes with a known solution (= which stamps were
XORed). When two motifs overlap, the XOR-combined solution may have a
shorter par; the orchestrator's par-reducer takes care of that.
"""

from __future__ import annotations

import random
from typing import Callable, Dict, Iterator, List, Optional, Sequence, Tuple

from ..core.book import GeneratedLevel
from ..core.geometry import (
    Move,
    enumerate_moves,
    int_to_tiles,
    move_mask,
    operation_masks,
)


# A motif is a function that, given a (w, h, anchor_x, anchor_y, scale),
# returns a list of Moves on the canvas. Returning an empty list means
# "no fit".
MotifFn = Callable[[int, int, int, int, int], List[Move]]


# --- Motif definitions ----------------------------------------------------

def _frame(w: int, h: int, ax: int, ay: int, scale: int) -> List[Move]:
    """Hollow square frame of side 2*scale, top-left at (ax, ay).

    Built as: outer-square XOR inner-square.
    """
    s = 2 * scale
    if s < 2:
        return []
    if ax + s > w or ay + s > h:
        return []
    moves = [Move(ax, ay, s)]
    if s >= 4:
        moves.append(Move(ax + 1, ay + 1, s - 2))
    return moves


def _filled_square(w: int, h: int, ax: int, ay: int, scale: int) -> List[Move]:
    s = 2 * scale
    if s < 2 or ax + s > w or ay + s > h:
        return []
    return [Move(ax, ay, s)]


def _plus(w: int, h: int, ax: int, ay: int, scale: int) -> List[Move]:
    """A '+' shape made of two overlapping squares.

    The plus is built from a horizontal-bar XOR vertical-bar; both are 2x2
    and placed offset. We approximate with two 2x2 blocks that overlap on
    the centre cell, producing a 3-cell corner pattern -- but a more
    visually plus-like motif emerges from the overlap of three 2x2's.
    """
    s = 2  # only scale=1 supported (3x3 plus)
    # We need three 2x2 blocks centred to produce a plus on a 3x3 region.
    # XOR of (2x2 at (cx, cy)) and (2x2 at (cx+1, cy)) and (2x2 at (cx, cy+1))
    # = the L tromino at (cx, cy)? Let's just hardcode the moves.
    if scale != 1 or ax + 3 > w or ay + 3 > h:
        return []
    return [
        Move(ax, ay + 1, 2),       # left bar
        Move(ax + 1, ay, 2),       # top bar
        Move(ax + 1, ay + 1, 2),   # bottom-right (cancels middle => a plus)
    ]


def _diamond(w: int, h: int, ax: int, ay: int, scale: int) -> List[Move]:
    """Concentric corners suggesting a diamond outline.

    Made of two squares: outer 4x4 and inner 2x2 offset by 1.
    """
    if scale != 1 or ax + 4 > w or ay + 4 > h:
        return []
    return [Move(ax, ay, 4), Move(ax + 1, ay + 1, 2)]


def _checker_mini(w: int, h: int, ax: int, ay: int, scale: int) -> List[Move]:
    """Tiny checker pattern in a 4x4 area: four 2x2 stamps in a 2x2 layout.

    XORing four 2x2 stamps in a 2x2 arrangement leaves a checker.
    """
    if scale != 1 or ax + 4 > w or ay + 4 > h:
        return []
    return [
        Move(ax, ay, 2), Move(ax + 2, ay, 2),
        Move(ax, ay + 2, 2), Move(ax + 2, ay + 2, 2),
    ]


def _double_frame(w: int, h: int, ax: int, ay: int, scale: int) -> List[Move]:
    """Nested frames: outer s=4 frame plus inner s=2 frame (square within square)."""
    if scale != 1 or ax + 6 > w or ay + 6 > h:
        return []
    return [
        Move(ax, ay, 6), Move(ax + 1, ay + 1, 4),
        Move(ax + 2, ay + 2, 2),
    ]


def _l_shape(w: int, h: int, ax: int, ay: int, scale: int) -> List[Move]:
    """An L shape: two 2x2 stamps sharing one cell, one above the other."""
    if scale != 1 or ax + 3 > w or ay + 3 > h:
        return []
    return [Move(ax, ay, 2), Move(ax, ay + 1, 2), Move(ax + 1, ay + 1, 2)]


MOTIFS: Dict[str, MotifFn] = {
    "frame": _frame,
    "filled_square": _filled_square,
    "plus": _plus,
    "diamond": _diamond,
    "checker_mini": _checker_mini,
    "double_frame": _double_frame,
    "l_shape": _l_shape,
}


# --- Generator ------------------------------------------------------------

def _solution_from_moves(used: List[Move], w: int, h: int) -> List[int]:
    moves = enumerate_moves(w, h)
    sol = [0] * len(moves)
    seen = {}  # toggle: appearing twice cancels
    for mv in used:
        seen[mv] = 1 - seen.get(mv, 0)
    for mv, on in seen.items():
        if not on:
            continue
        # find index
        for i, ref in enumerate(moves):
            if ref == mv:
                sol[i] = 1
                break
    return sol


def generate_motifs(
    size_choices: Sequence[Tuple[int, int]],
    *,
    n_candidates: int,
    motif_count: int | Tuple[int, int] = (1, 3),
    motif_names: Optional[Sequence[str]] = None,
    rng: Optional[random.Random] = None,
) -> Iterator[GeneratedLevel]:
    rng = rng or random.Random()
    available = list(motif_names) if motif_names else list(MOTIFS.keys())
    for _ in range(n_candidates):
        w, h = rng.choice(list(size_choices))
        masks = operation_masks(w, h)
        n = len(masks)
        if isinstance(motif_count, tuple):
            k = rng.randint(motif_count[0], motif_count[1])
        else:
            k = int(motif_count)

        used_moves: List[Move] = []
        for _ in range(k):
            name = rng.choice(available)
            fn = MOTIFS[name]
            for _attempt in range(20):
                ax = rng.randrange(w)
                ay = rng.randrange(h)
                scale = rng.choice([1, 1, 1, 2])  # bias toward small
                ms = fn(w, h, ax, ay, scale)
                if ms:
                    used_moves.extend(ms)
                    break

        if not used_moves:
            continue

        sol = _solution_from_moves(used_moves, w, h)
        pattern = 0
        for i, take in enumerate(sol):
            if take:
                pattern ^= masks[i]
        if pattern == 0:
            continue

        tiles = int_to_tiles(pattern, w, h)
        yield GeneratedLevel(
            tiles=tiles,
            par=sum(sol),
            solution=sol,
            solution_type="running",
            width=w,
            height=h,
            metadata={"generator": "motifs", "motif_count": k},
        )
