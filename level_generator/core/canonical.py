"""Canonical forms for symmetry-aware deduplication.

Every grid level has up to **8 visual variants** under the dihedral
group D4: the identity, three rotations (90/180/270) and four reflections
(horizontal, vertical, both diagonals). For a square grid (w == h) all
eight live in the same shape; for a non-square grid (w != h) the four
non-rotational variants live in the transposed shape (h, w). We always
generate all eight so that, for instance, a 4x5 candidate is recognised
as the same level as a 5x4 corpus entry.

We additionally consider the *colour-complement* (swap black and white).
Players can perceive ``A`` and ``not A`` as essentially the same puzzle
and the existing daily set has avoided most such duplicates. This module
emits two flavours of key:

  * ``canonical_shape_key``  : invariant under the 8 symmetries.
  * ``canonical_full_key``   : invariant under the 8 symmetries *and*
    colour-complement (so up to 16 equivalent forms collapse to one).

Use :func:`canonical_full_key` when you want the strictest dedup.
"""

from __future__ import annotations

from typing import List, Tuple

from .geometry import int_to_tiles, tiles_to_int


def _transpose(bits: int, w: int, h: int) -> Tuple[int, int, int]:
    """Transpose: swap rows & columns. New width = h, new height = w."""
    out = 0
    for y in range(h):
        for x in range(w):
            if (bits >> (x + y * w)) & 1:
                out |= 1 << (y + x * h)
    return out, h, w


def _flip_x(bits: int, w: int, h: int) -> Tuple[int, int, int]:
    out = 0
    for y in range(h):
        for x in range(w):
            if (bits >> (x + y * w)) & 1:
                out |= 1 << ((w - 1 - x) + y * w)
    return out, w, h


def _flip_y(bits: int, w: int, h: int) -> Tuple[int, int, int]:
    out = 0
    for y in range(h):
        for x in range(w):
            if (bits >> (x + y * w)) & 1:
                out |= 1 << (x + (h - 1 - y) * w)
    return out, w, h


def all_symmetries(bits: int, w: int, h: int) -> List[Tuple[int, int, int]]:
    """All distinct symmetric variants of ``(bits, w, h)`` under D4.

    Returns up to 8 distinct ``(bits, w, h)`` tuples. For a square grid
    every variant has the same shape; for a non-square grid four of them
    live in the transposed shape ``(h, w)``. Including the transposes is
    important so that, e.g. a 4x5 pattern and its 5x4 transpose match.
    """
    seen = set()
    variants: List[Tuple[int, int, int]] = []
    base = (bits, w, h)

    fx = _flip_x(*base)
    fy = _flip_y(*base)
    candidates: List[Tuple[int, int, int]] = [
        base,
        fx,
        fy,
        _flip_y(*fx),   # 180 rotation
    ]
    tr = _transpose(*base)
    candidates.extend([
        tr,
        _flip_x(*tr),
        _flip_y(*tr),
        _flip_y(*_flip_x(*tr)),
    ])

    for v in candidates:
        if v not in seen:
            seen.add(v)
            variants.append(v)
    return variants


def _complement(bits: int, w: int, h: int) -> int:
    """Swap black and white in every cell."""
    full = (1 << (w * h)) - 1
    return bits ^ full


def canonical_shape_key(bits: int, w: int, h: int) -> Tuple[int, int, int]:
    """Lex-min ``(w, h, bits)`` over the visual symmetry group only."""
    variants = all_symmetries(bits, w, h)
    return min((v_w, v_h, v_bits) for (v_bits, v_w, v_h) in variants)


def canonical_full_key(bits: int, w: int, h: int) -> Tuple[int, int, int]:
    """Lex-min canonical key including colour-complement.

    This is the strictest equivalence used for dedup against existing levels.
    """
    sym_min = canonical_shape_key(bits, w, h)
    comp_min = canonical_shape_key(_complement(bits, w, h), w, h)
    return min(sym_min, comp_min)


def canonical_key_from_tiles(tiles: List[List[int]]) -> Tuple[int, int, int]:
    bits, w, h = tiles_to_int(tiles)
    return canonical_full_key(bits, w, h)


# --- Re-exports for public consumers --------------------------------------

__all__ = [
    "all_symmetries",
    "canonical_shape_key",
    "canonical_full_key",
    "canonical_key_from_tiles",
]
