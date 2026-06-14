
// TODO: perhaps I should move these functions to a new file called something like "storage"

import { supabase } from "modules/utils/api";
import { Level } from "./Level";
import { ChallengeStatistics } from "./challengeStatistics";

// Challenge statistics storage methods
export function getChallengeStatsCacheKey(levelId: string): string {
  return `challenge_stats_${levelId}`;
}

export function getCachedChallengeStatistics(levelId: string): ChallengeStatistics | null {
  const cached = localStorage.getItem(getChallengeStatsCacheKey(levelId));
  if (!cached) return null;
  try {
    return JSON.parse(cached) as ChallengeStatistics;
  } catch (e) { 
    return null;
  }
}

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