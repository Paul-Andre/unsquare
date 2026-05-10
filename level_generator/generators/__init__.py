"""Generators for Unsquare daily-level candidates.

Each generator is a callable that yields :class:`GeneratedLevel` objects.
They are intentionally thin: heavy lifting (par computation, dedup) is
done by the orchestrator in :mod:`level_generator.generate`.

Available generators:

  * :mod:`random_walk` -- forward construction with random ops (with knobs
    on size, walk length, op-size weighting and overshoot tolerance).
  * :mod:`symmetric`   -- forward construction with imposed dihedral
    symmetry, producing visually pleasing patterns.
  * :mod:`motifs`      -- combine a curated dictionary of small visual
    primitives.
  * :mod:`targeted_par`-- pick a fixed number of operations whose linear
    combination is hard to shorten (rejects "wasted moves").
  * :mod:`perturb`     -- mutate an existing level by toggling random
    operations.
"""

from .random_walk import generate_random_walk
from .symmetric import generate_symmetric
from .motifs import generate_motifs
from .targeted_par import generate_targeted_par
from .perturb import generate_perturb

__all__ = [
    "generate_random_walk",
    "generate_symmetric",
    "generate_motifs",
    "generate_targeted_par",
    "generate_perturb",
]
