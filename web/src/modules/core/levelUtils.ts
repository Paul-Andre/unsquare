
// TODO: perhaps I should move these functions to a new file called something like "storage"

import { supabase } from "modules/utils/api";
import { Level } from "./Level";

export type ChallengeStatistics = {
  player_best: number;
  top_best: number;
  rank: number;
  total_players: number;
}

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
export function getCachedChallengeStatistics(levelId: string): ChallengeStatistics | null {
  const cached = localStorage.getItem(getChallengeStatsCacheKey(levelId));
  if (!cached) return null;
  try {
    return JSON.parse(cached) as ChallengeStatistics;
  } catch (e) { 
    return null;
  }
}

// TODO: figure out the type of the stats.
export function saveChallengeStatistics(levelId: string, stats: ChallengeStatistics): void {
  localStorage.setItem(getChallengeStatsCacheKey(levelId), JSON.stringify(stats));
}

export async function saveLevelToSupabase(level: Level, saveSolution: boolean): Promise<void> {
  const json = level.toJsonObject();
  if (!saveSolution) {
    delete json.solutions;
    delete json.solutionType;
    delete json.par;
  }
  delete json.index;

  const { data, error } = await supabase
    .from('levels')
    .insert({
      level_id: level.id,
      full_identifier: level.getFullIdentifier(),
      data_json: json,
      user_generated: false
    })

  if (error) {
    throw error;
  }

  console.log('Inserted:', data)
}