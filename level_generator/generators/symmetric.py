"""Symmetric-construction generator.

For each candidate, we pick a symmetry group ``G`` from a small menu and
build a level whose tile pattern is invariant under ``G``: every time we
apply a random operation we also apply *all* the operations in its orbit.

Available groups (square grids only -- non-squares fall back to the
non-90-rotation subgroups when needed):

  * ``"D4"``        : full dihedral (8 elements).
  * ``"C4"``        : 4-fold rotation only.
  * ``"D2_axes"``   : horizontal & vertical mirror.
  * ``"D2_diag"``   : the two diagonal mirrors (square only).
  * ``"C2"``        : 180-degree rotation only.
  * ``"identity"``  : no symmetry (degenerates to the random_walk variant).

In addition to plain "operation orbit" symmetrisation, we produce a small
fraction of *anti-symmetric* candidates where one of the orbit operations
is *omitted* on purpose -- this slightly breaks the symmetry and tends to
create more interesting puzzles.
"""

from __future__ import annotations

import random
from typing import Iterator, List, Optional, Sequence, Set, Tuple

from ..core.book import GeneratedLevel
from ..core.geometry import (
    Move,
    enumerate_moves,
    int_to_tiles,
    move_mask,
    operation_masks,
)

GroupName = str


def _move_orbit(move: Move, w: int, h: int, group: GroupName) -> List[Move]:
    """All Moves in ``move``'s orbit under ``group`` that fit on the grid."""
    elts = []
    s = move.size
    x, y = move.x, move.y

    def add(mx: int, my: int) -> None:
        if 0 <= mx and mx + s <= w and 0 <= my and my + s <= h:
            elts.append(Move(mx, my, s))

    add(x, y)  # identity
    if group in ("D4", "C4", "D2_axes", "D2_diag", "C2"):
        # 180 rotation
        add(w - x - s, h - y - s)
    if group in ("D4", "D2_axes"):
        # horizontal flip (mirror x)
        add(w - x - s, y)
        # vertical flip (mirror y)
        add(x, h - y - s)
    if group in ("D4", "C4"):
        # 90 / 270 rotations -- only valid on square grids; otherwise drop.
        if w == h:
            add(y, w - x - s)
            add(h - y - s, x)
    if group == "D4":
        # diagonal mirrors (square only)
        if w == h:
            add(y, x)
            add(w - y - s, h - x - s)
    if group == "D2_diag":
        if w == h:
            add(y, x)
            add(w - y - s, h - x - s)
    # de-dup
    seen: Set[Move] = set()
    out: List[Move] = []
    for m in elts:
        if m not in seen:
            seen.add(m)
            out.append(m)
    return out


def _index_of(moves: Sequence[Move], target: Move) -> int:
    for i, m in enumerate(moves):
        if m == target:
            return i
    return -1


def generate_symmetric(
    size_choices: Sequence[Tuple[int, int]],
    num_strokes: int | Tuple[int, int],
    *,
    n_candidates: int,
    groups: Sequence[GroupName] = ("D4", "C4", "D2_axes", "C2"),
    break_symmetry_prob: float = 0.0,
    rng: Optional[random.Random] = None,
) -> Iterator[GeneratedLevel]:
    """Yield ``n_candidates`` symmetric levels.

    ``num_strokes`` is the number of *orbit centres* to pick, not the
    number of operations -- the actual op count is
    ``sum_i len(orbit_i)`` (modulo overlap cancellations).

    ``break_symmetry_prob`` is the per-stroke probability that one move
    in the orbit is randomly dropped, intentionally producing a slightly
    asymmetric pattern.
    """
    rng = rng or random.Random()
    for _ in range(n_candidates):
        w, h = rng.choice(list(size_choices))
        # On a non-square grid, drop groups that depend on transposition.
        avail_groups: List[GroupName] = []
        for g in groups:
            if w != h and g in ("D4", "C4", "D2_diag"):
                continue
            avail_groups.append(g)
        if not avail_groups:
            avail_groups = ["C2", "D2_axes"]
        group = rng.choice(avail_groups)

        moves = enumerate_moves(w, h)
        masks = operation_masks(w, h)

        if isinstance(num_strokes, tuple):
            k = rng.randint(num_strokes[0], num_strokes[1])
        else:
            k = int(num_strokes)

        chosen_indices: Set[int] = set()
        construction: List[int] = [0] * len(moves)
        for _ in range(k):
            seed = rng.choice(moves)
            orbit = _move_orbit(seed, w, h, group)
            if rng.random() < break_symmetry_prob and len(orbit) > 1:
                drop_idx = rng.randrange(len(orbit))
                orbit = [m for i, m in enumerate(orbit) if i != drop_idx]
            for mv in orbit:
                idx = _index_of(moves, mv)
                if idx == -1:
                    continue
                # XOR-toggle (re-applying cancels).
                if construction[idx]:
                    construction[idx] = 0
                else:
                    construction[idx] = 1

        pattern = 0
        for i, take in enumerate(construction):
            if take:
                pattern ^= masks[i]
        if pattern == 0:
            continue
        tiles = int_to_tiles(pattern, w, h)
        yield GeneratedLevel(
            tiles=tiles,
            par=sum(construction),
            solution=construction,
            solution_type="running",
            width=w,
            height=h,
            metadata={
                "generator": "symmetric",
                "group": group,
                "strokes": k,
                "break_symmetry_prob": break_symmetry_prob,
            },
        )
