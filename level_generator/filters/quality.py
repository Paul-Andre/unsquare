"""Per-level quality scoring & hard filters.

Hard filters reject obviously broken / boring candidates:

  * empty (no black tiles) or fully-black
  * black-tile fraction outside ``black_fraction_range``
  * par outside ``par_range``
  * black tiles only in a tiny patch (degenerate-looking)

The aggregate score combines several heuristics, all in [0, 1] then
weighted-summed. Higher is better.

  * compactness        : 1 - bbox_area / total_area  (favour compact black)
  * symmetry           : best D4 / D2 self-overlap fraction
  * density_centring   : 1 - |black_fraction - 0.5|  (favour middle density)
  * par_targetting     : Gaussian bump centred on a target par
  * non_trivial_solver : 1 if multiple solutions / nonzero kernel else 0.5

You can tune weights via :class:`ScoreWeights`.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Optional, Tuple

from ..core.book import GeneratedLevel
from ..core.canonical import all_symmetries
from ..core.geometry import popcount, tiles_to_int


@dataclass
class FilterConfig:
    par_range: Tuple[int, int] = (3, 10)
    black_fraction_range: Tuple[float, float] = (0.05, 0.65)
    require_min_size: int = 4  # min(width, height) >= this
    bbox_min_area: int = 6     # bounding box of the black region must cover this many cells
    forbid_all_white: bool = True
    forbid_all_black: bool = True


@dataclass
class ScoreWeights:
    compactness: float = 0.20
    symmetry: float = 0.30
    density: float = 0.15
    par_targetting: float = 0.20
    non_trivial: float = 0.15
    target_par: int = 6
    par_target_sigma: float = 2.5


def _bbox_of_black(bits: int, w: int, h: int) -> Tuple[int, int, int, int]:
    """``(minx, miny, maxx, maxy)`` of the cells with bit set; (-1,-1,-1,-1) if none."""
    minx = w
    miny = h
    maxx = -1
    maxy = -1
    for y in range(h):
        for x in range(w):
            if (bits >> (x + y * w)) & 1:
                if x < minx:
                    minx = x
                if y < miny:
                    miny = y
                if x > maxx:
                    maxx = x
                if y > maxy:
                    maxy = y
    if maxx < 0:
        return -1, -1, -1, -1
    return minx, miny, maxx, maxy


def hard_filter(
    level: GeneratedLevel,
    config: FilterConfig,
) -> Optional[str]:
    """Return ``None`` if ``level`` passes, else a short reason string."""
    w, h = level.width, level.height
    if min(w, h) < config.require_min_size:
        return f"size too small ({w}x{h})"

    bits, _, _ = tiles_to_int(level.tiles)
    n = w * h
    black = popcount(bits)
    if config.forbid_all_white and black == 0:
        return "all white"
    if config.forbid_all_black and black == n:
        return "all black"
    frac = black / n
    lo, hi = config.black_fraction_range
    if not (lo <= frac <= hi):
        return f"black fraction {frac:.2f} out of [{lo:.2f}, {hi:.2f}]"

    if level.par is not None:
        plo, phi = config.par_range
        if not (plo <= level.par <= phi):
            return f"par {level.par} out of [{plo}, {phi}]"

    minx, miny, maxx, maxy = _bbox_of_black(bits, w, h)
    if maxx >= 0:
        bbox_area = (maxx - minx + 1) * (maxy - miny + 1)
        if bbox_area < config.bbox_min_area:
            return f"bbox area {bbox_area} below {config.bbox_min_area}"

    return None


def _symmetry_overlap(bits: int, w: int, h: int) -> float:
    """Best self-overlap fraction across non-identity symmetries.

    Counts cells that match between the pattern and each symmetric variant
    and returns the maximum (over variants) divided by ``w*h``.
    """
    n = w * h
    if n == 0:
        return 0.0
    best = 0
    for vbits, vw, vh in all_symmetries(bits, w, h):
        if (vw, vh) != (w, h):
            continue  # different shape (only happens for transposes of non-square)
        if vbits == bits:
            continue  # identity self-overlap doesn't tell us anything
        # XOR shows differences; popcount is the count of differing cells.
        diff = popcount(vbits ^ bits)
        match = n - diff
        if match > best:
            best = match
    return best / n


def score_level(
    level: GeneratedLevel,
    weights: ScoreWeights,
) -> float:
    bits, w, h = tiles_to_int(level.tiles)
    n = max(1, w * h)
    black = popcount(bits)
    frac = black / n

    minx, miny, maxx, maxy = _bbox_of_black(bits, w, h)
    if maxx >= 0:
        bbox_area = (maxx - minx + 1) * (maxy - miny + 1)
        compactness = 1 - bbox_area / n
    else:
        compactness = 0.0

    sym = _symmetry_overlap(bits, w, h)
    density = 1 - abs(frac - 0.5) * 2  # peaks at frac=0.5

    if level.par is None:
        par_targetting = 0.5
    else:
        diff = level.par - weights.target_par
        par_targetting = math.exp(-(diff * diff) / (2 * weights.par_target_sigma ** 2))

    has_kernel = bool(level.metadata.get("non_trivial_solver", False))
    non_trivial = 1.0 if has_kernel else 0.5

    return (
        weights.compactness * compactness
        + weights.symmetry * sym
        + weights.density * density
        + weights.par_targetting * par_targetting
        + weights.non_trivial * non_trivial
    )
