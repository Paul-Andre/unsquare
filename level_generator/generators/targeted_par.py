"""Targeted-par generator: pick a fixed number ``k`` of operations whose XOR
sum cannot be expressed by fewer than ``k`` operations.

This generator is useful when you want a level whose *intended* par is
exactly ``k``. We sample ``k`` operations uniformly without replacement
and check that the resulting target tile pattern's optimal par equals
``k`` (i.e. there is no "shortcut" via the kernel). When it doesn't, we
either re-sample or accept it labelled with the lower par.

The optimal par check uses the same hybrid Gaussian + kernel reduction
machinery as the orchestrator, so it is fast.
"""

from __future__ import annotations

import random
from typing import Iterator, Optional, Sequence, Tuple

from ..core.book import GeneratedLevel
from ..core.geometry import (
    enumerate_moves,
    int_to_tiles,
    operation_masks,
)
from ..core.par import compute_par


def generate_targeted_par(
    size_choices: Sequence[Tuple[int, int]],
    target_par: int | Tuple[int, int],
    *,
    n_candidates: int,
    max_attempts_per_candidate: int = 60,
    accept_shortened: bool = True,
    rng: Optional[random.Random] = None,
) -> Iterator[GeneratedLevel]:
    rng = rng or random.Random()
    for _ in range(n_candidates):
        w, h = rng.choice(list(size_choices))
        moves = enumerate_moves(w, h)
        masks = operation_masks(w, h)
        m = len(masks)
        if isinstance(target_par, tuple):
            k = rng.randint(target_par[0], target_par[1])
        else:
            k = int(target_par)
        k = min(k, m)

        produced = None
        for _attempt in range(max_attempts_per_candidate):
            picks = rng.sample(range(m), k)
            sol_vec = [0] * m
            for idx in picks:
                sol_vec[idx] = 1
            pattern = 0
            for idx in picks:
                pattern ^= masks[idx]
            if pattern == 0:
                continue
            par_res = compute_par(w, h, pattern, rng=rng)
            if par_res is None:
                continue
            if par_res.par == k:
                produced = (pattern, sol_vec, par_res, k)
                break
            if accept_shortened and par_res.par >= k - 1:
                # Close enough: accept with the actual (possibly smaller) par.
                produced = (pattern, sol_vec, par_res, par_res.par)
                # don't break -- try a couple more times to land exactly on k
        if produced is None:
            continue
        pattern, _construction_sol, par_res, used_par = produced
        # Use the par-optimised solution rather than the construction.
        actual_solution = [(par_res.solution_bits >> i) & 1 for i in range(m)]
        tiles = int_to_tiles(pattern, w, h)
        yield GeneratedLevel(
            tiles=tiles,
            par=par_res.par,
            solution=actual_solution,
            solution_type="optimal" if par_res.is_optimal else "running",
            width=w,
            height=h,
            metadata={
                "generator": "targeted_par",
                "target_par": k,
                "par_is_optimal": par_res.is_optimal,
            },
        )
