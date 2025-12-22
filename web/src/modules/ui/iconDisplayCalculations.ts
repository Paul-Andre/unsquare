"use strict";

import { vector_sum, ericTilesNumber, obviousScore } from '../core/algo.ts';
import { Level } from '../core/Level.ts';

export type IconDisplayType = "par" | "eric" | "obv" | "eric/par" | "obv/par" | "none";

/**
 * Calculate the minimum value across all solutions using a calculation function.
 */
function calculateMinValue(
  level: Level,
  calculateFn: (level: Level, solution: number[]) => number
): number {
  if (!level.solutions || level.solutions.length === 0) {
    return Infinity;
  }
  let min = Infinity;
  for (const solution of level.solutions) {
    const value = calculateFn(level, solution);
    min = Math.min(min, value);
  }
  return min;
}

/**
 * Calculate the display value for a level icon based on the display type.
 * Returns null if no value should be displayed.
 */
export function calculateIconDisplayValue(level: Level, displayType: IconDisplayType): number | null {
  if (displayType === "none") {
    return null;
  }

  if (!level.solutions || level.solutions.length === 0) {
    return null;
  }

  if (displayType === "par") {
    return vector_sum(level.solutions[0]);
  }

  if (displayType === "eric") {
    const minEric = calculateMinValue(level, ericTilesNumber);
    return minEric === Infinity ? 0 : minEric;
  }

  if (displayType === "obv") {
    const minObv = calculateMinValue(level, obviousScore);
    // Multiply by 100 and round to integer
    return minObv === Infinity ? 0 : Math.round(minObv * 100);
  }

  if (displayType === "eric/par") {
    const par = vector_sum(level.solutions[0]);
    const minEric = calculateMinValue(level, ericTilesNumber);
    if (par === 0) {
      return 0;
    }
    return minEric === Infinity ? 0 : Math.round((minEric / par) * 10);
  }

  if (displayType === "obv/par") {
    const par = vector_sum(level.solutions[0]);
    const minObv = calculateMinValue(level, obviousScore);
    if (par === 0) {
      return 0;
    }
    return minObv === Infinity ? 0 : Math.round((minObv / par) * 1000);
  }

  return null;
}

/**
 * Get the color for a par display value.
 * Returns empty string if no color should be applied.
 */
export function getParDisplayColor(displayValue: number | null): string {
  if (displayValue === null) {
    return "";
  }
  const colors = ["", "black", "black", "magenta", "red", "orange", "cyan", "green", "purple", "blue"];
  return colors[displayValue] || "";
}

