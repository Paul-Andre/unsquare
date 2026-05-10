"""GF(2) linear algebra on bit-packed vectors.

Each operation in Unsquare can be represented as a bitset in a single
Python ``int`` (one bit per tile). A level on a ``w x h`` grid then has

    n = w*h           tile cells (the "cell space")
    m = #operations   operations (one row per move)

We work primarily on the ``m x (n+1)`` matrix whose ``i``-th row is the
operation mask augmented by one column carrying the *target* tile pattern.
Doing row reduction on this gives both:

  * any solution ``x in {0,1}^m`` such that XOR of selected operations
    equals the target pattern; and
  * a basis of the *kernel* (operations subsets that XOR to zero).

Both are needed by :mod:`level_generator.core.par`.
"""

from __future__ import annotations

from typing import List, Optional, Tuple


def solve_and_kernel(
    op_masks: Tuple[int, ...],
    n_cells: int,
    target_bits: int,
) -> Optional[Tuple[List[int], List[int]]]:
    """Solve ``A^T x = target`` over GF(2) and return ``(solution, kernel)``.

    Args:
        op_masks: tuple of operation masks (one ``int`` per operation).
        n_cells: number of cells (i.e. bits used) in any mask / target.
        target_bits: tile pattern to reach (XOR sum of selected ops must equal it).

    Returns:
        ``(x, kernel)`` where ``x`` is a list of 0/1 of length ``m`` such that
        XOR of selected operations equals ``target_bits``, and ``kernel`` is a
        list of 0/1-vectors (each as an ``int`` bitset of width ``m``) spanning
        all ``y`` with XOR-sum equal to zero. Returns ``None`` if the target is
        unreachable.

    Implementation notes:
        We perform Gaussian elimination on the ``m`` rows ``op_masks[i] | (target_bit_i << n_cells)``
        but instead of carrying the target in column ``n_cells``, we carry an
        identity tag in columns ``n_cells .. n_cells + m - 1``. After reduction,
        any zero-row whose tag is nonzero gives a kernel vector; rows that
        match remaining target bits give the solution.

        We use a slightly different (and simpler) two-pass scheme: a "PLU"-ish
        decomposition of ``A`` (the m x n matrix whose i-th row is op i) into
        a row echelon form, while keeping track of column-pivots. From there
        both a particular solution and the kernel basis fall out.
    """
    m = len(op_masks)
    if m == 0:
        return ([], []) if target_bits == 0 else None

    # rows[i] is the (current) reduced row vector for op i; tag[i] is a bitset
    # over original-row indices recording which combination of original rows
    # produced this reduced row.
    rows = list(op_masks)
    tag = [1 << i for i in range(m)]

    pivot_col_for_row: List[int] = [-1] * m  # column index of the pivot of row i (-1 if zero row)
    row_for_pivot_col: List[int] = [-1] * n_cells

    r = 0  # next free row index in the reduction
    for c in range(n_cells):
        # find a row at index >= r whose bit c is set
        pivot_row = -1
        bit_c = 1 << c
        for i in range(r, m):
            if rows[i] & bit_c:
                pivot_row = i
                break
        if pivot_row == -1:
            continue
        if pivot_row != r:
            rows[r], rows[pivot_row] = rows[pivot_row], rows[r]
            tag[r], tag[pivot_row] = tag[pivot_row], tag[r]
        # eliminate bit c from every other row
        for i in range(m):
            if i != r and (rows[i] & bit_c):
                rows[i] ^= rows[r]
                tag[i] ^= tag[r]
        pivot_col_for_row[r] = c
        row_for_pivot_col[c] = r
        r += 1
        if r == m:
            break

    # rows[r:] are now all-zero in the cell columns; tag[r:] encodes the kernel.
    kernel = [tag[i] for i in range(r, m) if tag[i] != 0]

    # Particular solution: walk pivot columns in order; for each pivot column
    # currently set in ``rem``, XOR-in the corresponding reduced row and tag.
    # Bits at non-pivot columns may flip during this process; only after all
    # pivot columns have been processed can we tell whether the residual is
    # zero (= reachable).
    solution_bits = 0
    rem = target_bits
    for c in range(n_cells):
        if not ((rem >> c) & 1):
            continue
        i = row_for_pivot_col[c]
        if i == -1:
            # Non-pivot column with a set bit; skip for now and check residual.
            continue
        solution_bits ^= tag[i]
        rem ^= rows[i]
    if rem != 0:
        return None

    solution_vec = [(solution_bits >> i) & 1 for i in range(m)]
    return solution_vec, kernel


def vec_xor_kernel(solution_bits: int, kernel_combo_bits: int) -> int:
    """Apply a kernel combination (XOR) to a solution given as a bitset."""
    return solution_bits ^ kernel_combo_bits


def bits_to_vec(bits: int, m: int) -> List[int]:
    return [(bits >> i) & 1 for i in range(m)]


def vec_to_bits(vec: List[int]) -> int:
    out = 0
    for i, v in enumerate(vec):
        if v:
            out |= 1 << i
    return out
