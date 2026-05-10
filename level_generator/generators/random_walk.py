"""Random-walk generator: forward construction by XOR-ing random ops.

Knobs:
  * ``size_choices`` -- list of (width, height) tuples to pick from.
  * ``num_ops``      -- number of operations to apply (or a (lo, hi) range).
  * ``op_size_bias`` -- "uniform" (each Move equally likely) or "size_weighted"
    (probability proportional to ``size**bias``). The size-weighted variant
    favours bigger square stamps, which produces more "filled" levels.
  * ``allow_revisits`` -- if False, each operation can be picked at most once
    (so the upper-bound par equals ``num_ops``). If True, duplicate picks may
    cancel each other (useful to explore different patterns).
"""

from __future__ import annotations

import random
from typing import Iterator, List, Optional, Sequence, Tuple

from ..core.book import GeneratedLevel
from ..core.geometry import (
    enumerate_moves,
    int_to_tiles,
    operation_masks,
)


def generate_random_walk(
    size_choices: Sequence[Tuple[int, int]],
    num_ops: int | Tuple[int, int],
    *,
    n_candidates: int,
    op_size_bias: str = "uniform",  # "uniform" | "size_weighted"
    size_bias_exp: float = 1.5,
    allow_revisits: bool = False,
    rng: Optional[random.Random] = None,
) -> Iterator[GeneratedLevel]:
    rng = rng or random.Random()
    for _ in range(n_candidates):
        w, h = rng.choice(list(size_choices))
        moves = enumerate_moves(w, h)
        masks = operation_masks(w, h)
        m = len(moves)

        # Determine how many ops to apply.
        if isinstance(num_ops, tuple):
            k = rng.randint(num_ops[0], num_ops[1])
        else:
            k = int(num_ops)
        k = min(k, m)

        if op_size_bias == "size_weighted":
            weights = [(mv.size ** size_bias_exp) for mv in moves]
        elif op_size_bias == "uniform":
            weights = None
        else:
            raise ValueError(f"unknown op_size_bias: {op_size_bias}")

        chosen: List[int] = []
        if not allow_revisits:
            # Sample without replacement.
            if weights is None:
                chosen = rng.sample(range(m), k)
            else:
                # Weighted sampling without replacement (Efraimidis-Spirakis).
                keys = [(rng.random() ** (1.0 / max(wt, 1e-9)), i) for i, wt in enumerate(weights)]
                keys.sort(reverse=True)
                chosen = [i for _, i in keys[:k]]
        else:
            for _ in range(k):
                idx = rng.choices(range(m), weights=weights, k=1)[0]
                chosen.append(idx)

        # Compute the resulting tile pattern.
        pattern = 0
        sol_bits_used = set()
        for idx in chosen:
            pattern ^= masks[idx]
            if idx in sol_bits_used:
                sol_bits_used.discard(idx)
            else:
                sol_bits_used.add(idx)
        if pattern == 0:
            # Cancellation produced an empty level; skip.
            continue

        # Build the construction-time solution vector (does not have to be
        # minimal; the orchestrator may replace it with an optimised one).
        construction_solution = [0] * m
        for idx in sol_bits_used:
            construction_solution[idx] = 1

        tiles = int_to_tiles(pattern, w, h)
        yield GeneratedLevel(
            tiles=tiles,
            par=sum(construction_solution),
            solution=construction_solution,
            solution_type="running",
            width=w,
            height=h,
            metadata={
                "generator": "random_walk",
                "op_size_bias": op_size_bias,
                "construction_ops": k,
                "allow_revisits": allow_revisits,
            },
        )
