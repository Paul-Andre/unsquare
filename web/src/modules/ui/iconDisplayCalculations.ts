"use strict";

import { start } from 'repl';
import { vector_sum, ericTilesNumber, obviousScore } from '../core/algo.ts';
import { Level } from '../core/Level.ts';

export type IconDisplayType = "par" | "eric" | "obv" | "eric/par" | "obv/par" | "daily" | "none";

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
export function calculateIconDisplayValue(level: Level, displayType: IconDisplayType, nonHiddenIndex: number | null = null): number | string | null {
  if (displayType === "none") {
    return null;
  }

  if (displayType === "daily") {
    if (nonHiddenIndex === null) {
      return null;
    }
    const startDate = level.book?.startDate?? null;
    if (startDate === null) {
      return null;
    }
    const date = new Date(startDate.getTime() + nonHiddenIndex * 24 * 60 * 60 * 1000);
    const monthAbbr = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const month = monthAbbr[date.getMonth()];
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}${day}`;
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

