/**
 * Smoke / scratch checks for the linear algebra in `algo.ts`.
 * Nothing here runs unless you import this module and call an exported runner
 * (avoids side effects and console noise on every page load).
 */

import { assert } from '../utils/helpers.ts';
import type { Arithmetic } from './algo.ts';
import {
  transpose_matrix,
  vector_multiply_matrix,
  vector_apply_modulus,
  solve_gaussian,
  vector_equal,
  MOD_2,
} from './algo.ts';

/** Quick manual check: multiply `a` by operation matrix `b`, reduce mod 2, then Gaussian-solve. */
export function test_multiply_and_gaussian(a: number[], b: number[][]): void {
  const c = vector_multiply_matrix(a, b);
  vector_apply_modulus(c, 2);
  console.log(a, b, c);
  const ret = solve_gaussian(b, c, MOD_2);
  console.log(ret, b, c);
}

function random_vector(n: number, mod: number): number[] {
  const rr: number[] = [];
  for (let j = 0; j < n; j++) {
    rr.push(Math.floor(Math.random() * mod));
  }
  return rr;
}

function random_matrix(m: number, n: number, mod: number): number[][] {
  const ret: number[][] = [];
  for (let i = 0; i < m; i++) {
    const rr: number[] = [];
    for (let j = 0; j < n; j++) {
      rr.push(Math.floor(Math.random() * mod));
    }
    ret.push(rr);
  }
  return ret;
}

/** Assertions and tiny fixed examples that used to run at `algo.ts` import time. */
export function runAlgoSmokeTests(): void {
  assert(vector_equal([1, 2, 3], [1, 2, 3]));
  assert(vector_equal([1, 2, 3], [1, 2, 2]) === false);
  assert(vector_equal([], []));

  {
    const a = [
      [0, 1, 2],
      [3, 4, 5],
    ];
    const b = transpose_matrix(a);
    console.log('transpose_matrix', a, b);
  }
  {
    const a = [1, 0, 1];
    const b = [
      [1, 0, 1, 0],
      [0, 1, 0, 0],
      [0, 0, 0, 1],
    ];
    test_multiply_and_gaussian(a, b);
  }
  {
    const a = [1, 0, 1];
    const b = [
      [1, 0, 1, 0],
      [1, 0, 0, 0],
      [0, 0, 1, 0],
    ];
    test_multiply_and_gaussian(a, b);
  }
}

/** Optional stress loop (was behind `if (false)` in `algo.ts`). */
export function runAlgoRandomGaussianStress(iterations: number): void {
  for (let i = 0; i < iterations; i++) {
    const n = Math.floor(Math.random() * 10) + 1;
    const m = Math.floor(Math.random() * 10) + 1;
    const a = random_vector(m, 2);
    const b = random_matrix(m, n, 2);
    test_multiply_and_gaussian(a, b);
  }
}
