"use strict";

import { vector_sum, ericTilesNumber, obviousScore } from '../core/algo.ts';
import { Level } from '../core/Level.ts';

export type IconDisplayType = "par" | "eric" | "obv" | "eric/par" | "obv/par" | "none";

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
    // Calculate minimum eric_partition_number across all solutions
    let minEric = Infinity;
    for (let solution of level.solutions) {
      let eric = ericTilesNumber(level, solution);
      minEric = Math.min(minEric, eric);
    }
    return minEric === Infinity ? 0 : minEric;
  }

  if (displayType === "obv") {
    // Calculate minimum obviousScore across all solutions
    let minObv = Infinity;
    for (let solution of level.solutions) {
      let obv = obviousScore(level, solution);
      minObv = Math.min(minObv, obv);
    }
    // Multiply by 100 and round to integer
    return minObv === Infinity ? 0 : Math.round(minObv * 100);
  }

  if (displayType === "eric/par") {
    // Calculate eric/par ratio
    let par = vector_sum(level.solutions[0]);
    let minEric = Infinity;
    for (let solution of level.solutions) {
      let eric = ericTilesNumber(level, solution);
      minEric = Math.min(minEric, eric);
    }
    if (par === 0) {
      return 0;
    }
    return minEric === Infinity ? 0 : Math.round((minEric / par) * 10);
  }

  if (displayType === "obv/par") {
    // Calculate obv/par ratio
    let par = vector_sum(level.solutions[0]);
    let minObv = Infinity;
    for (let solution of level.solutions) {
      let obv = obviousScore(level, solution);
      minObv = Math.min(minObv, obv);
    }
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

