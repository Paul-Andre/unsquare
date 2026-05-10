"""Daily-level generator orchestrator.

Pulls together everything in this package to generate a JSON "book" of
candidate daily levels for review.

Pipeline (per candidate):

  1. Sampled by one of the registered generators (random_walk, symmetric,
     motifs, targeted_par, perturb).
  2. Hard-filtered (size, par range, black-fraction range, ...).
  3. Par-optimised: a Gaussian solution + kernel reduction yields the best
     known par and one provably (or near-) optimal solution.
  4. Re-filtered against the *post-optimisation* par.
  5. Deduplicated against (a) any existing level in the project, and (b)
     all other accepted candidates so far. Symmetry & colour-complement
     are honoured.
  6. Scored and finally sorted (best first) before writing the book.

CLI (see ``--help``):

    python -m level_generator.generate \\
        --out generated_dailies.json \\
        --count 200 \\
        --target-par 6 \\
        --par-range 3 10 \\
        --sizes 5x5,6x6,7x7,8x8

The bulk of the configuration is exposed; the defaults are good for a
typical daily-batch review session.
"""

from __future__ import annotations

import argparse
import os
import random
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Set, Tuple

from .core.book import GeneratedLevel, write_book
from .core.canonical import canonical_full_key
from .core.dedup import keys_for_level_from_record
from .core.existing import collect_existing_keys
from .core.geometry import int_to_tiles, num_operations, popcount, tiles_to_int
from .core.par import compute_par
from .filters.quality import (
    FilterConfig,
    ScoreWeights,
    hard_filter,
    score_level,
)
from .generators import (
    generate_motifs,
    generate_perturb,
    generate_random_walk,
    generate_symmetric,
    generate_targeted_par,
)


# ----------------------------------------------------------------------
# Mix-control: how many candidates each generator should attempt.
# ----------------------------------------------------------------------

@dataclass
class GeneratorMix:
    random_walk: int = 200
    symmetric: int = 200
    motifs: int = 100
    targeted_par: int = 80
    perturb: int = 80


@dataclass
class GenerationConfig:
    sizes: Sequence[Tuple[int, int]] = (
        (4, 4), (5, 5), (5, 5), (6, 6), (6, 6), (7, 7), (7, 7), (8, 8),
    )
    par_range: Tuple[int, int] = (3, 10)
    target_par: int = 6
    seed: Optional[int] = None
    mix: GeneratorMix = field(default_factory=GeneratorMix)
    perturb_sources: Sequence[str] = (
        "web/public/api/v1/daily_levels_book.json",
    )
    output_count: int = 200
    pretty_json: bool = False
    title: str = "Generated daily-level candidates"


# ----------------------------------------------------------------------
# Orchestration
# ----------------------------------------------------------------------

def _parse_size(s: str) -> Tuple[int, int]:
    if "x" in s:
        a, b = s.split("x", 1)
    else:
        a = b = s
    return int(a), int(b)


def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        prog="python -m level_generator.generate",
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument("--out", required=True, help="Output JSON book path.")
    p.add_argument("--count", type=int, default=200,
                   help="How many top-scoring candidates to keep (default: 200).")
    p.add_argument(
        "--sizes",
        default="4x4,5x5,5x5,6x6,6x6,7x7,7x7,8x8",
        help="Comma-separated size pool, e.g. '5x5,6x6,7x7'. Repeats bias the sampling.",
    )
    p.add_argument("--par-range", nargs=2, type=int, default=[3, 10], metavar=("LO", "HI"))
    p.add_argument("--target-par", type=int, default=6,
                   help="Par the scorer prefers (Gaussian-bump centred here).")
    p.add_argument("--seed", type=int, default=None)
    p.add_argument("--pretty", action="store_true", help="Pretty-print the output JSON.")
    p.add_argument("--title", default="Generated daily-level candidates")
    p.add_argument(
        "--mix",
        default="random_walk=200,symmetric=200,motifs=100,targeted_par=80,perturb=80",
        help="Per-generator candidate budget, e.g. 'random_walk=300,symmetric=300'.",
    )
    p.add_argument(
        "--perturb-sources",
        default="web/public/api/v1/daily_levels_book.json",
        help="Comma-separated paths used as seed levels for the 'perturb' generator.",
    )
    p.add_argument("--no-dedupe-against-existing", action="store_true",
                   help="(debug) skip the dedup-against-existing pass.")
    p.add_argument("--verbose", action="store_true")
    return p.parse_args(argv)


def _build_config(ns: argparse.Namespace) -> GenerationConfig:
    sizes = [_parse_size(s) for s in ns.sizes.split(",") if s.strip()]
    mix = GeneratorMix()
    for kv in ns.mix.split(","):
        if not kv.strip():
            continue
        k, v = kv.split("=", 1)
        if not hasattr(mix, k.strip()):
            raise SystemExit(f"unknown generator '{k}' in --mix")
        setattr(mix, k.strip(), int(v))
    perturb_sources = tuple(s for s in ns.perturb_sources.split(",") if s.strip())
    return GenerationConfig(
        sizes=tuple(sizes),
        par_range=tuple(ns.par_range),  # type: ignore[arg-type]
        target_par=ns.target_par,
        seed=ns.seed,
        mix=mix,
        perturb_sources=perturb_sources,
        output_count=ns.count,
        pretty_json=ns.pretty,
        title=ns.title,
    )


def _refine_par(level: GeneratedLevel) -> Tuple[GeneratedLevel, bool]:
    """Replace the level's par/solution with the optimised version.

    Returns ``(level, was_reachable)``.
    """
    bits, w, h = tiles_to_int(level.tiles)
    par_res = compute_par(w, h, bits)
    if par_res is None:
        return level, False
    m = num_operations(w, h)
    sol = [(par_res.solution_bits >> i) & 1 for i in range(m)]
    new_level = GeneratedLevel(
        tiles=level.tiles,
        par=par_res.par,
        solution=sol,
        solution_type="optimal" if par_res.is_optimal else "running",
        width=w,
        height=h,
        metadata={
            **level.metadata,
            "par_is_optimal": par_res.is_optimal,
            "construction_par": level.par,
        },
    )
    return new_level, True


def _annotate(level: GeneratedLevel) -> GeneratedLevel:
    bits, w, h = tiles_to_int(level.tiles)
    black = popcount(bits)
    n = max(1, w * h)
    minx = w
    miny = h
    maxx = maxy = -1
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
    bbox_area = (maxx - minx + 1) * (maxy - miny + 1) if maxx >= 0 else 0
    level.metadata.update({
        "black_count": black,
        "black_fraction": round(black / n, 4),
        "bbox_area_fraction": round(bbox_area / n, 4),
        "size": f"{w}x{h}",
    })
    return level


def run(config: GenerationConfig, *, dedupe_against_existing: bool = True, verbose: bool = False) -> List[GeneratedLevel]:
    rng = random.Random(config.seed)

    # ----- 1. existing-key set -----
    existing_keys: Set[Tuple] = set()
    if dedupe_against_existing:
        if verbose:
            print("Loading existing levels for de-dup...")
        corpus = collect_existing_keys(verbose=verbose)
        existing_keys = corpus.keys
        if verbose:
            print(f"  {corpus.level_count} existing levels from {corpus.file_count} files; "
                  f"{len(existing_keys)} unique crop-aware canonical keys.")

    # ----- 2. spawn generators -----
    sources: List[Iterable[GeneratedLevel]] = []
    sources.append(generate_random_walk(
        size_choices=config.sizes,
        num_ops=(config.par_range[0] + 1, config.par_range[1] + 4),
        n_candidates=config.mix.random_walk,
        op_size_bias="size_weighted",
        size_bias_exp=0.8,
        rng=rng,
    ))
    sources.append(generate_random_walk(
        size_choices=config.sizes,
        num_ops=(config.par_range[0], config.par_range[1] + 2),
        n_candidates=config.mix.random_walk // 2,
        op_size_bias="uniform",
        rng=rng,
    ))
    sources.append(generate_symmetric(
        size_choices=config.sizes,
        num_strokes=(2, 5),
        n_candidates=config.mix.symmetric,
        groups=("D4", "C4", "D2_axes", "C2"),
        break_symmetry_prob=0.1,
        rng=rng,
    ))
    sources.append(generate_motifs(
        size_choices=config.sizes,
        n_candidates=config.mix.motifs,
        motif_count=(1, 3),
        rng=rng,
    ))
    sources.append(generate_targeted_par(
        size_choices=config.sizes,
        target_par=(config.par_range[0] + 1, config.par_range[1] - 1),
        n_candidates=config.mix.targeted_par,
        rng=rng,
    ))
    sources.append(generate_perturb(
        sources=config.perturb_sources,
        size_choices=config.sizes,
        n_candidates=config.mix.perturb,
        mutations=(1, 2),
        rng=rng,
    ))

    # ----- 3. hard-filter, par-refine, dedup, score -----
    accepted: List[Tuple[float, GeneratedLevel]] = []
    seen_keys_in_batch: Set[Tuple] = set()
    counts: Dict[str, int] = {}
    rejects: Dict[str, int] = {}

    filter_cfg = FilterConfig(par_range=config.par_range)
    weights = ScoreWeights(target_par=config.target_par)

    for src in sources:
        for level in src:
            gen_name = level.metadata.get("generator", "?")
            counts[gen_name] = counts.get(gen_name, 0) + 1

            reason = hard_filter(level, filter_cfg)
            if reason:
                rejects[reason] = rejects.get(reason, 0) + 1
                continue

            refined, ok = _refine_par(level)
            if not ok:
                rejects["unreachable"] = rejects.get("unreachable", 0) + 1
                continue

            reason = hard_filter(refined, filter_cfg)
            if reason:
                rejects[f"post-refine: {reason}"] = rejects.get(f"post-refine: {reason}", 0) + 1
                continue

            bits, w, h = tiles_to_int(refined.tiles)
            cand_keys = keys_for_level_from_record(
                bits, w, h,
                recorded_solutions=[refined.solution] if refined.solution else None,
            )
            if not cand_keys:
                cand_keys = {canonical_full_key(bits, w, h)}
            if any(k in existing_keys for k in cand_keys):
                rejects["dup-existing"] = rejects.get("dup-existing", 0) + 1
                continue
            if any(k in seen_keys_in_batch for k in cand_keys):
                rejects["dup-batch"] = rejects.get("dup-batch", 0) + 1
                continue
            seen_keys_in_batch.update(cand_keys)

            refined = _annotate(refined)
            sc = score_level(refined, weights)
            refined.metadata["score"] = round(sc, 4)
            accepted.append((sc, refined))

    accepted.sort(key=lambda x: x[0], reverse=True)
    top = [lvl for _, lvl in accepted[: config.output_count]]

    if verbose:
        print()
        print(f"Generated: {sum(counts.values())} raw candidates")
        for k, v in sorted(counts.items()):
            print(f"  - {k:>14}: {v}")
        print(f"Accepted: {len(accepted)}; keeping top {len(top)}.")
        print(f"Rejections:")
        for reason, n in sorted(rejects.items(), key=lambda kv: -kv[1]):
            print(f"  - {reason:<30}: {n}")
    return top


def main(argv: Optional[Sequence[str]] = None) -> int:
    ns = parse_args(argv)
    cfg = _build_config(ns)
    t0 = time.perf_counter()
    levels = run(
        cfg,
        dedupe_against_existing=not ns.no_dedupe_against_existing,
        verbose=ns.verbose,
    )
    elapsed = time.perf_counter() - t0
    book = write_book(
        levels,
        ns.out,
        title=cfg.title,
        extra_meta={"_gen_config": {
            "sizes": [f"{w}x{h}" for (w, h) in cfg.sizes],
            "par_range": list(cfg.par_range),
            "target_par": cfg.target_par,
            "seed": cfg.seed,
        }},
        pretty=cfg.pretty_json,
    )
    print(f"Wrote {len(levels)} levels to {ns.out} in {elapsed:.1f}s; "
          f"book id = {book['id']}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
