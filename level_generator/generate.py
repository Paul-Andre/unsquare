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
from .core.existing import DEFAULT_SOURCES, collect_existing_keys
from .core.geometry import int_to_tiles, num_operations, popcount, tiles_to_int
from .core.padding import (
    DEFAULT_PADDING,
    PaddingDistribution,
    derive_padding_distribution,
    recenter_and_pad,
)
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
    # Padding policy applied as a post-processing pass on each candidate.
    # ``"auto"`` -> derive an empirical distribution from the existing
    # daily-levels book at startup; ``"none"`` -> always P=0 (still
    # re-centres); ``"0:0.5,1:0.3,2:0.2"`` -> explicit distribution.
    padding_spec: str = "auto"
    keep_square: bool = True
    # If False, the post-generation crop / re-pad / centre step is
    # skipped entirely (and does not consume RNG draws). Useful to
    # reproduce pre-padding generator output for comparison.
    recenter: bool = True


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
    p.add_argument(
        "--padding",
        default="auto",
        help=(
            "Post-processing padding policy. 'auto' (default) derives the "
            "distribution from the existing daily-levels corpus; 'none' "
            "always picks P=0 (still re-centres); '0:0.5,1:0.3,2:0.2' "
            "explicitly weights P amounts."
        ),
    )
    p.add_argument(
        "--no-keep-square",
        action="store_true",
        help="Allow non-square output after padding. Default keeps grids square.",
    )
    p.add_argument(
        "--no-recenter",
        action="store_true",
        help=(
            "Skip the crop+pad+centre post-processing step entirely. "
            "Useful to reproduce pre-padding generator output. When set, "
            "--padding / --no-keep-square are ignored."
        ),
    )
    p.add_argument(
        "--label",
        default=None,
        help=(
            "Optional short name written to _gen_config.label. Useful to "
            "tie a run to a named entry in level_generator/EXPERIMENTS.md."
        ),
    )
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
        padding_spec=ns.padding,
        keep_square=not ns.no_keep_square,
        recenter=not ns.no_recenter,
    )


def _resolve_padding_distribution(spec: str, *, verbose: bool = False) -> Tuple[PaddingDistribution, str]:
    """Turn a CLI string into a :class:`PaddingDistribution`.

    Returns ``(dist, source_label)`` where ``source_label`` describes
    where the distribution came from for logging / metadata.
    """
    s = (spec or "").strip().lower()
    if s in ("auto", ""):
        # Derive from the daily levels corpus (single source).
        repo_root = Path(__file__).resolve().parents[1]
        for rel in DEFAULT_SOURCES:
            if "daily_levels_book" in rel:
                p = repo_root / rel
                if p.exists():
                    derived = derive_padding_distribution([p])
                    if derived is not None:
                        if verbose:
                            print(f"  padding distribution (auto from {rel}): {derived.as_dict()}")
                        return derived, f"auto:{rel}"
        if verbose:
            print(f"  padding distribution (auto fallback): {DEFAULT_PADDING.as_dict()}")
        return DEFAULT_PADDING, "auto:default"
    dist = PaddingDistribution.from_spec(spec)
    return dist, f"spec:{spec}"


def _refine_par(level: GeneratedLevel) -> Tuple[GeneratedLevel, bool]:
    """Replace the level's par/solution with the optimised version.

    Returns ``(level, was_reachable)``. ``compute_par`` derives its own
    content-stable RNG internally, so this function does not consume
    from the shared pipeline stream -- the candidate stream is
    unaffected by which levels exercise the heuristic path.
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


def _recenter_level(
    level: GeneratedLevel,
    *,
    distribution: PaddingDistribution,
    keep_square: bool,
) -> GeneratedLevel:
    """Crop + re-pad + centre a refined level. Par is preserved.

    Updates ``width``, ``height``, ``tiles`` and ``solution`` in place by
    returning a new :class:`GeneratedLevel` with the new geometry. Adds
    a ``_pad`` entry to ``metadata`` describing what happened.

    The RNG used for padding-amount sampling and odd-split direction is
    derived from the level's content + par, so this step is
    deterministic per input and does not consume from the shared
    pipeline stream.
    """
    bits, w, h = tiles_to_int(level.tiles)
    sub_rng = random.Random(f"recenter:{w}x{h}:{bits}:{level.par}")
    res = recenter_and_pad(
        level.tiles,
        level.solution,
        distribution=distribution,
        square=keep_square,
        rng=sub_rng,
    )
    pad_meta = {
        "tight_size": list(res.info.get("tight_size", (level.width, level.height))),
        "output_size": list(res.info.get("output_size", (res.width, res.height))),
        "padding_lrtb": res.info.get("padding"),
        "pad_amount": res.info.get("pad_amount"),
        "transformed": bool(res.info.get("transformed")),
    }
    if "skipped" in res.info:
        pad_meta["skipped"] = res.info["skipped"]
    return GeneratedLevel(
        tiles=res.tiles,
        par=level.par,
        solution=res.solution,
        solution_type=level.solution_type,
        width=res.width,
        height=res.height,
        metadata={**level.metadata, "_pad": pad_meta},
    )


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
    if config.recenter:
        padding_dist, padding_src = _resolve_padding_distribution(
            config.padding_spec, verbose=verbose,
        )
    else:
        padding_dist = DEFAULT_PADDING
        padding_src = "disabled"
        if verbose:
            print("  recenter/pad post-step DISABLED (--no-recenter)")

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

            # Post-process: crop to the support bbox, then re-pad and
            # centre. The output may be a different (typically larger)
            # size than the input -- that is intentional. Skipped (and
            # no RNG draw consumed) when --no-recenter is passed.
            if config.recenter:
                refined = _recenter_level(
                    refined,
                    distribution=padding_dist,
                    keep_square=config.keep_square,
                )

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
    # Record the literal invocation so the output file is self-identifying.
    # ``argv`` may be ``None`` when called as a CLI, in which case sys.argv
    # is the actual command. See level_generator/EXPERIMENTS.md.
    invocation = list(argv) if argv is not None else list(sys.argv[1:])
    book = write_book(
        levels,
        ns.out,
        title=cfg.title,
        extra_meta={"_gen_config": {
            "sizes": [f"{w}x{h}" for (w, h) in cfg.sizes],
            "par_range": list(cfg.par_range),
            "target_par": cfg.target_par,
            "seed": cfg.seed,
            "padding_spec": cfg.padding_spec,
            "keep_square": cfg.keep_square,
            "recenter": cfg.recenter,
            "mix": {
                "random_walk": cfg.mix.random_walk,
                "symmetric": cfg.mix.symmetric,
                "motifs": cfg.mix.motifs,
                "targeted_par": cfg.mix.targeted_par,
                "perturb": cfg.mix.perturb,
            },
            "perturb_sources": list(cfg.perturb_sources),
            "output_count": cfg.output_count,
            "invocation": invocation,
            "label": ns.label,
            "elapsed_s": round(elapsed, 2),
        }},
        pretty=cfg.pretty_json,
    )
    print(f"Wrote {len(levels)} levels to {ns.out} in {elapsed:.1f}s; "
          f"book id = {book['id']}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
