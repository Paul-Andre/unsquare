"""Smoke tests for the level generator.

Run with:
    python -m unittest level_generator.tests.test_smoke
"""

from __future__ import annotations

import json
import os
import random
import tempfile
import unittest
from pathlib import Path

from level_generator.core.book import GeneratedLevel, write_book
from level_generator.core.canonical import (
    all_symmetries,
    canonical_full_key,
)
from level_generator.core.geometry import (
    apply_solution,
    enumerate_moves,
    int_to_tiles,
    move_mask,
    num_operations,
    operation_masks,
    popcount,
    tiles_to_int,
)
from level_generator.core.linalg import solve_and_kernel, vec_to_bits
from level_generator.core.par import compute_par
from level_generator.generate import GenerationConfig, GeneratorMix, run
from level_generator.generators import (
    generate_motifs,
    generate_random_walk,
    generate_symmetric,
)


REPO_ROOT = Path(__file__).resolve().parents[2]


class GeometryTests(unittest.TestCase):
    def test_enumerate_moves_count(self):
        # Per the existing solver, m for a w x h grid is sum_{s>=2} (w-s+1)(h-s+1).
        for w, h in [(3, 3), (4, 4), (5, 5), (3, 5), (6, 6)]:
            expected = sum((w - s + 1) * (h - s + 1)
                           for s in range(2, min(w, h) + 1))
            self.assertEqual(num_operations(w, h), expected, (w, h))

    def test_move_mask_correctness(self):
        # On a 4x3 grid, a 2x2 move at (1, 0) should cover cells (1,0),(2,0),(1,1),(2,1).
        from level_generator.core.geometry import Move, cell_bit
        bits = move_mask(4, 3, Move(1, 0, 2))
        for x, y in [(1, 0), (2, 0), (1, 1), (2, 1)]:
            self.assertTrue((bits >> cell_bit(4, x, y)) & 1)
        self.assertEqual(popcount(bits), 4)

    def test_round_trip_tiles(self):
        rng = random.Random(0)
        for _ in range(20):
            w = rng.randint(2, 8)
            h = rng.randint(2, 8)
            n = w * h
            bits = rng.randrange(1 << n)
            tiles = int_to_tiles(bits, w, h)
            bits2, w2, h2 = tiles_to_int(tiles)
            self.assertEqual((bits, w, h), (bits2, w2, h2))


class LinAlgTests(unittest.TestCase):
    def test_round_trip_random_solution(self):
        rng = random.Random(1)
        for w, h in [(3, 3), (4, 4), (5, 5), (3, 5), (6, 6)]:
            masks = operation_masks(w, h)
            n = w * h
            m = len(masks)
            for _ in range(5):
                # Random solution -> target -> solve -> verify same target.
                x = [rng.randint(0, 1) for _ in range(m)]
                target = apply_solution(w, h, x)
                res = solve_and_kernel(masks, n, target)
                self.assertIsNotNone(res)
                sol_vec, kernel = res
                self.assertEqual(len(sol_vec), m)
                # Apply the solver's output and compare to the target.
                got = apply_solution(w, h, sol_vec)
                self.assertEqual(got, target, (w, h, x))
                # Each kernel vector must produce zero.
                for k in kernel:
                    kv = [(k >> i) & 1 for i in range(m)]
                    self.assertEqual(apply_solution(w, h, kv), 0)

    def test_unreachable_is_detected(self):
        # On 2x2 with only one operation (the 2x2 stamp), a single black cell
        # is unreachable.
        masks = operation_masks(2, 2)
        target = 0b0001  # only top-left
        res = solve_and_kernel(masks, 4, target)
        self.assertIsNone(res)


class ParTests(unittest.TestCase):
    def test_par_zero_for_blank(self):
        res = compute_par(5, 5, 0)
        self.assertIsNotNone(res)
        self.assertEqual(res.par, 0)

    def test_par_minimal_for_known(self):
        # Apply exactly one square op; optimal par must be 1.
        from level_generator.core.geometry import Move
        for w, h, mv in [(5, 5, Move(0, 0, 2)), (6, 6, Move(2, 1, 3)), (4, 4, Move(0, 0, 4))]:
            target = move_mask(w, h, mv)
            res = compute_par(w, h, target)
            self.assertIsNotNone(res)
            self.assertEqual(res.par, 1, (w, h, mv))
            self.assertTrue(res.is_optimal)

    def test_par_matches_existing_book(self):
        """For levels already in the daily book whose kernel is small enough
        for the *exact* path (5x5 and 6x6), :func:`compute_par` must find a
        solution at least as short as the recorded par."""
        path = REPO_ROOT / "web/public/api/v1/daily_levels_book.json"
        with open(path) as f:
            book = json.load(f)
        checked = 0
        for lvl in book["levels"]:
            tiles = lvl["tiles"]
            par = lvl.get("par")
            if par is None:
                continue
            bits, w, h = tiles_to_int(tiles)
            if max(w, h) > 6:
                continue
            res = compute_par(w, h, bits)
            self.assertIsNotNone(res, lvl.get("id"))
            self.assertTrue(res.is_optimal, lvl.get("id"))
            self.assertEqual(res.par, par, lvl.get("id"))
            checked += 1
            if checked > 30:
                break
        self.assertGreater(checked, 0)


class CanonicalTests(unittest.TestCase):
    def test_symmetries_dedup(self):
        # An asymmetric pattern on a 3x3 grid: only top-left cell.
        bits = 0b000000001
        variants = all_symmetries(bits, 3, 3)
        # 4 corners x 1 ... = 4 distinct variants under D4 reflections / rotations.
        self.assertEqual(len(variants), 4)

    def test_canonical_invariant(self):
        # Same pattern in different orientations must hash to the same key.
        for w, h in [(3, 3), (4, 4), (5, 5)]:
            from level_generator.core.canonical import _flip_x, _flip_y, _transpose
            rng = random.Random(7)
            for _ in range(5):
                bits = rng.randrange(1 << (w * h))
                k0 = canonical_full_key(bits, w, h)
                fx, fxw, fxh = _flip_x(bits, w, h)
                k1 = canonical_full_key(fx, fxw, fxh)
                fy, fyw, fyh = _flip_y(bits, w, h)
                k2 = canonical_full_key(fy, fyw, fyh)
                self.assertEqual(k0, k1)
                self.assertEqual(k0, k2)
                if w == h:
                    tr, tw, th = _transpose(bits, w, h)
                    k3 = canonical_full_key(tr, tw, th)
                    self.assertEqual(k0, k3)


class GeneratorTests(unittest.TestCase):
    def test_random_walk_yields_levels(self):
        rng = random.Random(0)
        gen = generate_random_walk(
            size_choices=[(5, 5)],
            num_ops=(3, 6),
            n_candidates=10,
            rng=rng,
        )
        levels = list(gen)
        self.assertGreater(len(levels), 5)
        for lvl in levels:
            self.assertEqual(lvl.width, 5)
            self.assertEqual(lvl.height, 5)
            # The construction-time solution must produce the level's tiles.
            target = apply_solution(lvl.width, lvl.height, lvl.solution)
            bits, _, _ = tiles_to_int(lvl.tiles)
            self.assertEqual(target, bits)

    def test_symmetric_yields_levels(self):
        rng = random.Random(0)
        gen = generate_symmetric(
            size_choices=[(6, 6)],
            num_strokes=(2, 4),
            n_candidates=10,
            groups=("D4",),
            rng=rng,
        )
        levels = list(gen)
        self.assertGreater(len(levels), 0)
        for lvl in levels:
            bits, w, h = tiles_to_int(lvl.tiles)
            self.assertEqual(canonical_full_key(bits, w, h), canonical_full_key(bits, w, h))

    def test_motifs_yields_levels(self):
        rng = random.Random(0)
        gen = generate_motifs(
            size_choices=[(7, 7)],
            n_candidates=10,
            motif_count=(1, 2),
            rng=rng,
        )
        levels = list(gen)
        self.assertGreater(len(levels), 0)


class OrchestrationTests(unittest.TestCase):
    def test_run_produces_unique_book(self):
        cfg = GenerationConfig(
            sizes=((5, 5), (6, 6)),
            par_range=(3, 8),
            target_par=5,
            seed=42,
            mix=GeneratorMix(random_walk=20, symmetric=20, motifs=10,
                             targeted_par=10, perturb=0),
            output_count=15,
        )
        levels = run(cfg, dedupe_against_existing=False, verbose=False)
        # No duplicates inside the produced book.
        keys = set()
        for lvl in levels:
            bits, w, h = tiles_to_int(lvl.tiles)
            keys.add(canonical_full_key(bits, w, h))
        self.assertEqual(len(keys), len(levels))
        # All have a par in range.
        for lvl in levels:
            self.assertIsNotNone(lvl.par)
            self.assertGreaterEqual(lvl.par, 3)
            self.assertLessEqual(lvl.par, 8)

    def test_write_book_round_trip(self):
        rng = random.Random(0)
        gen = generate_random_walk(
            size_choices=[(5, 5)],
            num_ops=(3, 5),
            n_candidates=3,
            rng=rng,
        )
        levels = list(gen)
        with tempfile.TemporaryDirectory() as d:
            out = os.path.join(d, "out.json")
            write_book(levels, out, title="x")
            with open(out) as f:
                back = json.load(f)
        self.assertIn("levels", back)
        self.assertEqual(len(back["levels"]), len(levels))


if __name__ == "__main__":
    unittest.main()
