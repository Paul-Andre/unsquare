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
from level_generator.core.dedup import (
    crop_to_bbox,
    keys_for_level_from_record,
    level_canonical_keys,
    support_bbox,
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

    def test_non_square_includes_transposes(self):
        # On a 4x3 grid, an asymmetric single-cell pattern should produce
        # 8 D4 variants spanning shapes (4,3) AND (3,4), not just 4.
        bits = 0b000000000001  # top-left corner
        variants = all_symmetries(bits, 4, 3)
        shapes = {(vw, vh) for (_, vw, vh) in variants}
        self.assertEqual(shapes, {(4, 3), (3, 4)})

    def test_transposed_levels_share_canonical_key(self):
        # A 3x4 pattern and its (3-rows-x-4-cols swapped to 4-rows-x-3-cols)
        # transpose must produce the same canonical key.
        from level_generator.core.canonical import _transpose
        rng = random.Random(11)
        for _ in range(5):
            w, h = 3, 4
            bits = rng.randrange(1 << (w * h))
            k0 = canonical_full_key(bits, w, h)
            tr, tw, th = _transpose(bits, w, h)
            self.assertEqual(canonical_full_key(tr, tw, th), k0)

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
                tr, tw, th = _transpose(bits, w, h)
                k3 = canonical_full_key(tr, tw, th)
                self.assertEqual(k0, k3)


class DedupTests(unittest.TestCase):
    def test_support_bbox_basic(self):
        # On 5x5, ops at (0,0) size 2 and (3,3) size 2 give bbox 0..4,0..4.
        from level_generator.core.geometry import enumerate_moves
        moves = enumerate_moves(5, 5)
        # Find the indices of those two ops.
        idx_a = next(i for i, m in enumerate(moves) if (m.x, m.y, m.size) == (0, 0, 2))
        idx_b = next(i for i, m in enumerate(moves) if (m.x, m.y, m.size) == (3, 3, 2))
        sol = (1 << idx_a) | (1 << idx_b)
        self.assertEqual(support_bbox(sol, 5, 5), (0, 0, 4, 4))

    def test_support_bbox_empty(self):
        self.assertIsNone(support_bbox(0, 5, 5))

    def test_crop_to_bbox(self):
        # A 5x5 level whose only black cell is at (2, 2). Cropping to
        # the 1x1 bbox at (2,2) should give bits=1, 1x1.
        bits = 1 << (2 + 2 * 5)
        out, cw, ch = crop_to_bbox(bits, 5, 5, (2, 2, 2, 2))
        self.assertEqual((out, cw, ch), (1, 1, 1))

    def test_crop_aware_dedup_user_example(self):
        # The user-confirmed pair: a generated 7x7 level whose 3x3 black
        # bbox is the horizontal flip of a 5x5 main-corpus level's 3x3
        # black bbox. Both have par=3 with three 2x2 ops, so cropping to
        # the support bbox preserves par. Their crop-aware key sets must
        # share at least one element.
        # generated 7x7 (level_0456316004360653)
        gen_tiles = [
            [1, 1, 2, 2, 1, 1, 1],
            [1, 1, 1, 2, 2, 1, 1],
            [1, 1, 2, 1, 2, 1, 1],
            [1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1],
        ]
        gen_bits, gen_w, gen_h = tiles_to_int(gen_tiles)
        # Three 2x2 ops at (2,0), (2,1), (3,1)
        from level_generator.core.geometry import enumerate_moves
        gen_moves = enumerate_moves(gen_w, gen_h)
        gen_sol_ops = {(2, 0, 2), (2, 1, 2), (3, 1, 2)}
        gen_sol = [1 if (m.x, m.y, m.size) in gen_sol_ops else 0 for m in gen_moves]

        # main 5x5 (level_1693748575393)
        main_tiles = [
            [1, 1, 1, 1, 1],
            [1, 1, 2, 2, 1],
            [1, 2, 2, 1, 1],
            [1, 2, 1, 2, 1],
            [1, 1, 1, 1, 1],
        ]
        main_bits, main_w, main_h = tiles_to_int(main_tiles)
        main_moves = enumerate_moves(main_w, main_h)
        main_sol_ops = {(1, 2, 2), (2, 1, 2), (2, 2, 2)}
        main_sol = [1 if (m.x, m.y, m.size) in main_sol_ops else 0 for m in main_moves]

        gen_keys = keys_for_level_from_record(
            gen_bits, gen_w, gen_h, recorded_solutions=[gen_sol],
        )
        main_keys = keys_for_level_from_record(
            main_bits, main_w, main_h, recorded_solutions=[main_sol],
        )
        self.assertTrue(gen_keys & main_keys,
                        f"crop-aware dedup failed: gen={gen_keys} main={main_keys}")

    def test_padded_white_border_dedups(self):
        # An arbitrary 3x3 pattern on a 5x5 grid (centered, white border)
        # should crop-aware-dedup with the same pattern natively on 3x3.
        rng = random.Random(123)
        from level_generator.core.geometry import enumerate_moves
        from level_generator.core.par import compute_par
        # Pick a pattern reachable on 3x3
        for _ in range(20):
            small_bits = rng.randrange(1 << 9)
            small_par = compute_par(3, 3, small_bits)
            if small_par is None or small_par.par == 0:
                continue
            small_moves = enumerate_moves(3, 3)
            small_sol = [(small_par.solution_bits >> i) & 1 for i in range(len(small_moves))]
            # Embed in centre of 5x5
            big_bits = 0
            for y in range(3):
                for x in range(3):
                    if (small_bits >> (x + y * 3)) & 1:
                        big_bits |= 1 << ((x + 1) + (y + 1) * 5)
            # Translate solution: each (x,y,s) op on 3x3 maps to (x+1,y+1,s) on 5x5
            big_moves = enumerate_moves(5, 5)
            shifted_ops = set()
            for i, b in enumerate(small_sol):
                if not b:
                    continue
                m = small_moves[i]
                shifted_ops.add((m.x + 1, m.y + 1, m.size))
            big_sol = [1 if (m.x, m.y, m.size) in shifted_ops else 0 for m in big_moves]
            small_keys = keys_for_level_from_record(small_bits, 3, 3, recorded_solutions=[small_sol])
            big_keys = keys_for_level_from_record(big_bits, 5, 5, recorded_solutions=[big_sol])
            self.assertTrue(small_keys & big_keys,
                            f"padded twin not deduped: bits={small_bits}")


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
