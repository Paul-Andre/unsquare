"""Grid geometry and operation enumeration for Unsquare.

A level lives on a width x height grid. The legal operations are *all*
square subgrids of side >= 2 that fit within the grid. Each operation
toggles every tile inside it (XOR over GF(2)).

We represent both tile patterns and operations as Python ``int`` values,
where bit ``x + y*width`` corresponds to cell ``(x, y)``. This makes XOR
combination a single ``int`` operation, which is fast.

The numbering convention for operations matches the rest of the codebase
(see ``Solver/solve_levels.py:generate_operations`` and
``web/src/modules/core/algo.ts:compute_operations``):

    for x in range(width):
        for y in range(height):
            for size in range(2, min(width-x, height-y)+1):
                yield Move(x, y, size)
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from typing import Iterable, Iterator, List, Tuple


@dataclass(frozen=True)
class Move:
    x: int
    y: int
    size: int


def grid_size(width: int, height: int) -> int:
    return width * height


def cell_bit(width: int, x: int, y: int) -> int:
    """Return the bit index for cell ``(x, y)`` on a grid of given width."""
    return x + y * width


def move_mask(width: int, height: int, move: Move) -> int:
    """Bitmask of cells covered by ``move``."""
    if move.x < 0 or move.y < 0:
        raise ValueError(f"move out of bounds: {move}")
    if move.x + move.size > width or move.y + move.size > height:
        raise ValueError(f"move out of bounds: {move} on {width}x{height}")
    if move.size < 2:
        raise ValueError(f"move size must be >= 2, got {move.size}")
    mask = 0
    for jj in range(move.size):
        row = ((1 << move.size) - 1) << (move.x + (move.y + jj) * width)
        mask |= row
    return mask


@lru_cache(maxsize=None)
def enumerate_moves(width: int, height: int) -> Tuple[Move, ...]:
    """All legal moves on a width x height grid (canonical order)."""
    moves: List[Move] = []
    for x in range(width):
        for y in range(height):
            for size in range(2, min(width - x, height - y) + 1):
                moves.append(Move(x, y, size))
    return tuple(moves)


@lru_cache(maxsize=None)
def operation_masks(width: int, height: int) -> Tuple[int, ...]:
    """Bit masks for each operation, in canonical order."""
    return tuple(move_mask(width, height, m) for m in enumerate_moves(width, height))


def num_operations(width: int, height: int) -> int:
    return len(enumerate_moves(width, height))


# --- Tile pattern conversions ---------------------------------------------

def tiles_to_int(tiles: List[List[int]]) -> Tuple[int, int, int]:
    """Convert a 2-D tile list (1=white, 2=black) to (bits, width, height).

    Bit ``x + y*width`` is set iff ``tiles[y][x] == 2``.
    """
    if not tiles:
        return 0, 0, 0
    height = len(tiles)
    width = len(tiles[0])
    bits = 0
    for y, row in enumerate(tiles):
        if len(row) != width:
            raise ValueError(f"row {y} has length {len(row)}, expected {width}")
        for x, cell in enumerate(row):
            if cell == 2:
                bits |= 1 << (x + y * width)
            elif cell != 1:
                raise ValueError(f"unexpected tile value {cell!r} at ({x},{y})")
    return bits, width, height


def int_to_tiles(bits: int, width: int, height: int) -> List[List[int]]:
    """Inverse of :func:`tiles_to_int`."""
    out = [[1] * width for _ in range(height)]
    for y in range(height):
        for x in range(width):
            if (bits >> (x + y * width)) & 1:
                out[y][x] = 2
    return out


def popcount(bits: int) -> int:
    """Number of set bits (Python 3.10+ has int.bit_count)."""
    return bits.bit_count()


def apply_solution(width: int, height: int, solution: Iterable[int]) -> int:
    """XOR-combine operations whose ``solution[i]`` is truthy."""
    masks = operation_masks(width, height)
    result = 0
    for i, take in enumerate(solution):
        if take:
            result ^= masks[i]
    return result
