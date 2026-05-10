"""Estimate (or compute exactly) the optimal par of a level.

The optimal par for a tile pattern ``t`` reachable on a ``w x h`` grid is

    par* = min { weight(x) : XOR over selected ops == t }
         = min { weight(x0 ^ k) : k in span(K) }

where ``x0`` is any particular solution, ``K`` is a kernel basis (operations
combinations that XOR to zero) and ``weight(.)`` is the number of selected
operations (Hamming weight on the bit-packed solution).

Computing par* exactly is the *minimum-weight coset* problem (i.e. syndrome
decoding), which is NP-hard in general. For Unsquare grids the kernel often
has small dimension relative to the operation count, so the following
hybrid approach is fast and exact for typical daily-level sizes:

1. Compute ``x0`` and ``K`` via :func:`solve_and_kernel`.
2. If ``|K|`` is small (default ``<= 22``), enumerate the full coset via a
   Gray-code walk; the result is provably optimal.
3. Otherwise run iterated local search: greedy 1-/2-/3-vector kernel
   reductions interleaved with multi-vector random kicks across many
   restarts. The result is an upper bound (``is_optimal=False``) but in
   practice matches the recorded par on >97% of 7x7 daily levels.

Empirically:

* up to 6x6 (kernel dim <= 20) the exact path returns par* in well under a
  second.
* 7x7 (kernel dim 42) finishes in a fraction of a second per level under
  the heuristic path with default settings.
"""

from __future__ import annotations

import random
from dataclasses import dataclass
from typing import List, Optional, Tuple

from .geometry import num_operations, operation_masks, popcount
from .linalg import solve_and_kernel, vec_to_bits


@dataclass
class ParResult:
    par: int
    solution_bits: int
    is_optimal: bool  # True if proven, False if only an upper bound


def compute_par(
    width: int,
    height: int,
    target_bits: int,
    *,
    exact_kernel_limit: int = 22,
    local_search_triples: bool = True,
    random_restarts: int = 32,
    kick_size: int = 3,
    rng: Optional[random.Random] = None,
) -> Optional[ParResult]:
    """Return a :class:`ParResult` for ``target_bits`` or ``None`` if unreachable.

    For grids whose kernel dimension is at most ``exact_kernel_limit`` we
    perform a Gray-code enumeration of the entire coset and the result is
    provably optimal. The default cutoff (22) is enough to cover every
    grid up to 6x6 exactly and runs in well under a second per call.

    For larger grids (kernel dim > limit) we run iterated local search:
    a greedy 1-/2-/3-vector descent followed by random kicks (XOR of
    ``kick_size`` random kernel vectors) repeated ``random_restarts``
    times. This reliably matches the recorded par on >97% of 7x7 daily
    levels in the corpus; ``is_optimal`` is ``False`` so callers can run a
    heavier solver downstream if a hard guarantee is required.
    """
    n = width * height
    masks = operation_masks(width, height)
    res = solve_and_kernel(masks, n, target_bits)
    if res is None:
        return None
    sol_vec, kernel = res
    sol_bits = vec_to_bits(sol_vec)

    sol_bits, _ = _reduce_with_singletons(sol_bits, kernel)

    if len(kernel) <= exact_kernel_limit:
        best = _enumerate_kernel_min(sol_bits, kernel)
        return ParResult(par=popcount(best), solution_bits=best, is_optimal=True)

    rng = rng or random.Random()
    best_bits = _local_descent(sol_bits, kernel, with_triples=local_search_triples)
    for _ in range(random_restarts):
        kick = 0
        for _ in range(kick_size):
            kick ^= kernel[rng.randrange(len(kernel))]
        cand = _local_descent(best_bits ^ kick, kernel, with_triples=local_search_triples)
        if popcount(cand) < popcount(best_bits):
            best_bits = cand
    return ParResult(par=popcount(best_bits), solution_bits=best_bits, is_optimal=False)


def _local_descent(sol_bits: int, kernel: List[int], *, with_triples: bool = True) -> int:
    """Iterate single -> pair -> triple kernel-vector reductions until stuck."""
    sol_bits, _ = _reduce_with_singletons(sol_bits, kernel)
    while True:
        sol_bits, improved = _reduce_with_pairs(sol_bits, kernel)
        if improved:
            sol_bits, _ = _reduce_with_singletons(sol_bits, kernel)
            continue
        if with_triples:
            sol_bits, improved = _reduce_with_triples(sol_bits, kernel)
            if improved:
                sol_bits, _ = _reduce_with_singletons(sol_bits, kernel)
                continue
        return sol_bits


# --- Helpers -------------------------------------------------------------

def _reduce_with_singletons(sol_bits: int, kernel: List[int]) -> Tuple[int, bool]:
    """Greedy: for each kernel vector ``k``, replace ``sol`` with ``sol ^ k`` if it lowers the weight.

    Repeats until no single ``k`` improves further. Returns ``(new_sol, improved_at_least_once)``.
    """
    improved_any = False
    while True:
        best_delta = 0
        best_k: Optional[int] = None
        cur_w = popcount(sol_bits)
        for k in kernel:
            new_w = popcount(sol_bits ^ k)
            d = cur_w - new_w
            if d > best_delta:
                best_delta = d
                best_k = k
        if best_k is None:
            return sol_bits, improved_any
        sol_bits ^= best_k
        improved_any = True


def _reduce_with_pairs(sol_bits: int, kernel: List[int]) -> Tuple[int, bool]:
    """Try every XOR of two distinct kernel vectors; apply best improvement (if any)."""
    cur_w = popcount(sol_bits)
    best_delta = 0
    best_combo = 0
    n_k = len(kernel)
    for i in range(n_k):
        ki = kernel[i]
        for j in range(i + 1, n_k):
            kij = ki ^ kernel[j]
            d = cur_w - popcount(sol_bits ^ kij)
            if d > best_delta:
                best_delta = d
                best_combo = kij
    if best_delta > 0:
        return sol_bits ^ best_combo, True
    return sol_bits, False


def _reduce_with_triples(sol_bits: int, kernel: List[int]) -> Tuple[int, bool]:
    """Try every XOR of three distinct kernel vectors; apply best improvement (if any).

    O(K^3) per call; only invoked when 1- and 2-vector reductions are stuck.
    """
    cur_w = popcount(sol_bits)
    best_delta = 0
    best_combo = 0
    n_k = len(kernel)
    for i in range(n_k):
        ki = kernel[i]
        for j in range(i + 1, n_k):
            kij = ki ^ kernel[j]
            for l in range(j + 1, n_k):
                kijl = kij ^ kernel[l]
                d = cur_w - popcount(sol_bits ^ kijl)
                if d > best_delta:
                    best_delta = d
                    best_combo = kijl
    if best_delta > 0:
        return sol_bits ^ best_combo, True
    return sol_bits, False


def _enumerate_kernel_min(sol_bits: int, kernel: List[int]) -> int:
    """Exact minimum weight in the coset ``sol_bits + span(kernel)``.

    Uses Gray-code style enumeration so each step is a single XOR. Assumes
    the input kernel basis is linearly independent (true for the output of
    :func:`solve_and_kernel`).
    """
    K = len(kernel)
    if K == 0:
        return sol_bits
    best = sol_bits
    best_w = popcount(sol_bits)
    cur = sol_bits
    total = 1 << K
    for t in range(1, total):
        flip_idx = (t & -t).bit_length() - 1
        cur ^= kernel[flip_idx]
        w = popcount(cur)
        if w < best_w:
            best_w = w
            best = cur
    return best


def solution_bits_to_vec(solution_bits: int, width: int, height: int) -> List[int]:
    """Convert a packed solution back to the conventional list of 0/1s."""
    m = num_operations(width, height)
    return [(solution_bits >> i) & 1 for i in range(m)]
