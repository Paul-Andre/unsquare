
// TODO: perhaps I should move these functions to a new file called something like "storage"

import { supabase } from "modules/utils/api";
import { Level } from "./Level";
import { getCurrentContestId } from "./contests";

export type ChallengeStatistics = {
  player_best: number;
  top_best: number;
  rank: number;
  total_players: number;
}

// "lsk" = local storage key
// Best moves storage methods
export function getLskForBestNumMoves(level: Level, contest_id: string | null): string {
  if (contest_id !== null) {
    return `contest_${contest_id} ${level.getFullIdentifier()} bestNumMoves`;
  }
  return `${level.getFullIdentifier()} bestNumMoves`;
}

export function getBestNumMoves(level: Level): number | null {
  let sol = localStorage.getItem(getLskForBestNumMoves(level, getCurrentContestId()));
  if (sol === null) return null;
  return Number(sol);
}

function localStorageSetMin(key: string, num: number): void {
  let prev = localStorage.getItem(key);
  if (prev !== null) {
    let prevNum = Number(prev);
    if (prevNum <= num) {
      // Do not overwrite better previous score
      return;
    }
  }
  localStorage.setItem(key, num.toString());
}

export function setBestNumMoves(level: Level, num: number): void {
  localStorageSetMin(getLskForBestNumMoves(level, getCurrentContestId()), num);
  localStorageSetMin(getLskForBestNumMoves(level, null), num);
}

export function clearBestNumMoves(level: Level): void {
  localStorage.removeItem(getLskForBestNumMoves(level, getCurrentContestId()));
  localStorage.removeItem(getLskForBestNumMoves(level, null));
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