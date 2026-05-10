"""Canonical forms for symmetry-aware deduplication.

The square has 8 symmetries (the dihedral group D4): the identity, three
rotations (90/180/270), and four reflections (horizontal, vertical, the
two diagonals). For a non-square (w != h) grid only 4 symmetries preserve
shape (identity, 180 rotation, horizontal flip, vertical flip).

Two levels are *visually equivalent* if some symmetry maps one tile pattern
to the other. To dedupe, we map each level to a canonical key that is
constant across visual equivalence.

We additionally consider the *colour-complement* (swap black and white).
Players can perceive ``A`` and ``not A`` as essentially the same puzzle
and the existing daily set has avoided most such duplicates. This module
emits two flavours of key:

  * ``canonical_shape_key``  : invariant under D4 / D2 only.
  * ``canonical_full_key``   : invariant under D4 / D2 *and* complement.

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
    """All distinct symmetric variants of ``(bits, w, h)``.

    For a square grid (w==h) this returns up to 8 variants; for non-square
    grids, up to 4.
    """
    seen = set()
    variants: List[Tuple[int, int, int]] = []
    base = (bits, w, h)

    # Generate by composing flips & transposes (covers D4 / D2).
    candidates: List[Tuple[int, int, int]] = [base]
    fx = _flip_x(*base)
    fy = _flip_y(*base)
    candidates.append(fx)
    candidates.append(fy)
    candidates.append(_flip_y(*fx))  # 180 rotation
    if w == h:
        tr = _transpose(*base)
        candidates.append(tr)
        candidates.append(_flip_x(*tr))
        candidates.append(_flip_y(*tr))
        candidates.append(_flip_y(*_flip_x(*tr)))

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
