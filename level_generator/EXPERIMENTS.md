# level_generator experiments log

A chronological record of generator runs we want to be able to reproduce
or refer back to. Each entry lists the exact command, the code state
(commit + working-directory notes), and what we observed.

When adding an entry, prefer the order below; keep entries terse. New
entries go at the **bottom**.

Schema for each entry:

> **`<short-name>` — <YYYY-MM-DD>**
>
> *Purpose:*  one-line description of what we wanted from this run.
>
> *Code state:*  commit hash (and any uncommitted-but-relevant diffs).
>
> *Command:*  the literal shell invocation that produced the artifact.
>
> *Output:*  artefact path (and book id if useful).
>
> *Observations:*  what we saw / measured / decided.

The orchestrator also embeds the full resolved command into each output
book under `_gen_config.invocation`, so any individual book is
self-identifying. This log is the *narrative* layer on top of that.

---

> **Note on the v1 – v4 entries below.** These were written
> retroactively on 2026-05-10 while setting up this log; the runs
> themselves happened earlier and were not documented contemporaneously.
> Commands are reconstructed from the chat-session transcript and from
> the `_gen_config` metadata embedded in each output file. Entries
> tagged ⓑ (`backfilled`) are post-hoc. Future entries (from 2026-05-11
> onward) should be written *at the time of the run* and not carry that
> tag.

---

## `dailies_smoke_v1` — 2026-05-09 ⓑ

*Purpose:* first end-to-end smoke test of the initial generator.

*Code state:* commit `273800d` (the initial level_generator commit).

*Command:*

```
python3 -m level_generator.generate \
  --out generated_levels/dailies_smoke.json \
  --count 50 --sizes "5x5,5x5,6x6,6x6,7x7" \
  --par-range 3 8 --target-par 5 \
  --seed 1 --verbose
```

*(Mix not explicitly set — used the defaults at the time.)*

*Output:* `generated_levels/dailies_smoke.json`.

*Observations:* 50 levels; sizes 21/20/9 across 5x5/6x6/7x7.


## `dailies_smoke_v2` — 2026-05-09 ⓑ

*Purpose:* end-to-end run during crop-aware-dedup development, used as
the artefact attached to the dedup PR.

*Code state:* working-directory state of `master` shortly before commit
`703a93c` ("Add crop-aware dedup to level_generator."). Identical
behaviour to the committed code for this command: re-running the same
invocation at `703a93c` reproduces v2 at 49/50 overlap (the 1 differing
level is `compute_par` 7x7 OS-RNG non-determinism, see RNG notes
below).

*Command:*

```
rm -f level_generator/.dedup_cache.json && \
python3 -m level_generator.generate \
  --out generated_levels/dailies_smoke_v2.json \
  --count 50 \
  --sizes "5x5,5x5,6x6,6x6,7x7" \
  --par-range 3 8 \
  --target-par 5 \
  --mix "random_walk=120,symmetric=120,motifs=60,targeted_par=60,perturb=40" \
  --seed 1 \
  --pretty \
  --verbose
```

*Output:* `generated_levels/dailies_smoke_v2.json`.

*Observations:* 50 levels; sizes 23/20/7 across 5x5/6x6/7x7; pars
spread 4-6 (mean 5.04); 12 dup-existing rejections caught by the new
crop-aware dedup that the old shape-only key missed.


## `dailies_smoke_v3` — 2026-05-10 ⓑ  (deprecated)

*Purpose:* first smoke run of the centering / padding post-step.

*Status:* deleted; superseded by `dailies_smoke_v4_centered` once the
generator was made deterministic per `--seed`. Was also generated with
a different mix and size pool than v1/v2, which contributed to the
apparent "style change" the user observed.


## `dailies_smoke_v4_legacy` — 2026-05-10 ⓑ

*Purpose:* reproduce v2's style with the current committed code, with
the centering / padding post-step disabled (`--no-recenter`).

*Code state:* `703a93c` plus uncommitted padding module and (importantly)
the `compute_par` RNG plumbing change in `_refine_par` and
`targeted_par`. Note that the RNG-plumbing change *itself* shifts the
RNG stream, so this run does **not** byte-match v2 even though
`--no-recenter` skips the new post-step. See "RNG notes" below.

*Command:*

```
python3 -m level_generator.generate \
  --out generated_levels/dailies_smoke_v4_legacy.json \
  --count 50 \
  --sizes "5x5,5x5,6x6,6x6,7x7" \
  --par-range 3 8 \
  --target-par 5 \
  --mix "random_walk=120,symmetric=120,motifs=60,targeted_par=60,perturb=40" \
  --seed 1 \
  --no-recenter \
  --pretty
```

*Output:* `generated_levels/dailies_smoke_v4_legacy.json`.

*Observations:* deterministic per-seed (two consecutive runs are
byte-identical). Overlap with v2 is only ~1/50 because the RNG fix
shifts the candidate stream relative to HEAD.


## `dailies_smoke_v4_centered` — 2026-05-10 ⓑ

*Purpose:* same parameters as `v4_legacy`, but with the centering /
padding post-step on (default).

*Code state:* same as `v4_legacy` plus the recenter pass enabled.

*Command:*

```
python3 -m level_generator.generate \
  --out generated_levels/dailies_smoke_v4_centered.json \
  --count 50 \
  --sizes "5x5,5x5,6x6,6x6,7x7" \
  --par-range 3 8 \
  --target-par 5 \
  --mix "random_walk=120,symmetric=120,motifs=60,targeted_par=60,perturb=40" \
  --seed 1 \
  --padding auto \
  --pretty
```

*Output:* `generated_levels/dailies_smoke_v4_centered.json`.

*Observations:* deterministic per-seed. Levels post-cropped to their
support bbox and re-centred; padding amount sampled from the empirical
distribution fitted to the daily-levels corpus (`0:50,1:14,2:72,3:7,4:6,5:1`).
Output sizes shift up to 7x7..11x11 because most patterns get padded
to a square of side `max(W,H) + P`.

---

## `repro_v2_workaround` — 2026-05-10

*Purpose:* confirm that the divergence between the pre-RNG-fix HEAD code
and the post-RNG-fix code is *entirely* explained by RNG-stream
perturbation, i.e. that nothing else in the recent edits affects the
candidate set or scoring.

*Code state:* working dir at `703a93c` + uncommitted padding module +
new `compute_par(... rng=rng)` plumbing in `_refine_par` and
`targeted_par`, **temporarily reverted** for this single run (the two
call sites swapped back to `compute_par(w, h, bits)` with a `# TEMP`
marker). Restored immediately after the run.

*Command:*

```
python3 -m level_generator.generate \
  --out /tmp/repro_v2.json \
  --count 50 \
  --sizes "5x5,5x5,6x6,6x6,7x7" \
  --par-range 3 8 \
  --target-par 5 \
  --mix "random_walk=120,symmetric=120,motifs=60,targeted_par=60,perturb=40" \
  --seed 1 \
  --no-recenter \
  --pretty \
  --label repro_v2_workaround
```

*Output:* `/tmp/repro_v2.json` (not checked in).

*Observations:* 49/50 crop-aware overlap with `dailies_smoke_v2.json`;
size distribution 23 / 19 / 8 across 5x5 / 6x6 / 7x7 (v2: 23 / 20 / 7);
par distribution 14 / 21 / 15 across 4 / 5 / 6 (v2: 13 / 22 / 15). The
single differing level is the expected `compute_par` 7x7 OS-RNG
non-determinism. This isolates the RNG-stream perturbation as the
*sole* behavioural delta my recent fixes introduced vs HEAD.


## `repro_v2_centered_workaround` — 2026-05-10

*Purpose:* visualise what v2-style levels look like once the centering /
padding post-step is on, while otherwise keeping HEAD-style behaviour
(no RNG-stream perturbation).

*Code state:* same as `repro_v2_workaround` plus a third temporary edit:
`_recenter_level`'s `rng=rng` argument replaced with
`rng=random.Random()` so the centering step uses a fresh OS-seeded RNG
per candidate and does not consume from the main pipeline stream.
Reverted immediately after the run.

*Command:*

```
python3 -m level_generator.generate \
  --out /tmp/repro_v2_centered.json \
  --count 50 \
  --sizes "5x5,5x5,6x6,6x6,7x7" \
  --par-range 3 8 \
  --target-par 5 \
  --mix "random_walk=120,symmetric=120,motifs=60,targeted_par=60,perturb=40" \
  --seed 1 \
  --padding auto \
  --pretty \
  --label repro_v2_centered_workaround
```

*Output:* `generated_levels/dailies_smoke_repro_v2_centered.json`.

*Observations:* 24 of v2's 50 underlying patterns are present in this
run (crop-aware dedup), confirming that the centering step preserves
the underlying puzzle and just changes how it sits on the grid.
Full-canonical overlap drops to 1/50 because the new tiles have
different paddings than v2. Output sizes shift up to 5x5..12x12; the
sampled padding distribution and the underlying patterns are
v2-style. The 24/50 (rather than 49/50) figure is because the post-step
*expands* each pattern's "neighbourhood" in dedup-key space, so more
candidates collide with one another or with corpus levels and get
rejected — the top-50 has to come from a slightly different region of
the candidate pool.


## RNG notes (as of 2026-05-10)

`compute_par`'s heuristic path (kernel dim > 22, i.e. 7x7+) currently
takes an `rng` argument that, if `None`, falls back to a fresh
`random.Random()` seeded from OS entropy. That makes the result
non-deterministic across runs — different OS-RNG state of the day can
yield different par-optimal solutions for the same input (par itself
usually agrees but the specific minimum-weight coset member can differ).

Because the new crop-aware dedup keys depend on the *solution's*
support bbox (not just the tile pattern), this non-determinism
*cascades*: a different solution chosen for one 7x7 candidate can flip
dedup decisions for unrelated 5x5/6x6 candidates later in the stream.

A `_refine_par` patch threading the shared pipeline RNG into
`compute_par` (and similarly inside `targeted_par`) makes the orchestrator
deterministic per `--seed`, but at the cost of perturbing the shared
RNG stream relative to the pre-patch behaviour. So a "deterministic run"
of the v2 command no longer matches the historic v2 output.

A planned follow-up is to give `compute_par` an isolated RNG
seeded from a content-derived hash (or a small derived sub-rng), so
that:

1. `compute_par` is deterministic per input, regardless of pipeline timing.
2. The shared pipeline RNG is *not* consumed by `compute_par`, so
   v2-style commands still produce v2-style output.

The current `v4_legacy` and `v4_centered` artefacts pre-date that
follow-up.
