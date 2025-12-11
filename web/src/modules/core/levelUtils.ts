
// TODO: perhaps I should move these functions to a new file called something like "storage"

import { Level } from "./Level";

// "lsk" = local storage key
// Best moves storage methods
export function getLskForBestNumMoves(level: Level): string {
  return level.getFullIdentifier() + " bestNumMoves";
}

export function getBestNumMoves(level: Level): number | null {
  let sol = localStorage.getItem(getLskForBestNumMoves(level));
  if (sol === null) return null;
  return Number(sol);
}

export function setBestNumMoves(level: Level, num: number): void {
  localStorage.setItem(getLskForBestNumMoves(level), num.toString());
}

export function clearBestNumMoves(level: Level): void {
  localStorage.removeItem(getLskForBestNumMoves(level));
}

// Challenge statistics storage methods
export function getChallengeStatsCacheKey(levelId: string): string {
  return `challenge_stats_${levelId}`;
}

// TODO: figure out the type of the stats.
export function getCachedChallengeStatistics(levelId: string): Record<string, any> | null {
  const cached = localStorage.getItem(getChallengeStatsCacheKey(levelId));
  if (!cached) return null;
  try {
    return JSON.parse(cached);
  } catch (e) { 
    return null;
  }
}

// TODO: figure out the type of the stats.
export function saveChallengeStatistics(levelId: string, stats: Record<string, any>): void {
  localStorage.setItem(getChallengeStatsCacheKey(levelId), JSON.stringify(stats));
}
