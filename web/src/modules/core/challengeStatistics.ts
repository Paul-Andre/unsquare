"use strict";

import { supabase } from '../utils/api.ts';
import { ChallengeStatistics, getCachedChallengeStatistics, saveChallengeStatistics } from './levelUtils.ts';

/**
 * Fetches challenge statistics for a given level from Supabase
 */
export async function fetchChallengeStatistics(levelId: string): Promise<ChallengeStatistics | null> {
  const player_id = localStorage.player_id;
  if (!player_id) {
    return null;
  }

  try {
    const { data, error } = await supabase.rpc('get_player_level_summary', {
      p_player_id: player_id,
      p_level_id: levelId
    });

    if (error) {
      console.error("Error fetching challenge statistics:", error);
      return null;
    }

    return data;
  } catch (e) {
    console.error("Failed to fetch challenge statistics", e);
    return null;
  }
}

/**
 * Updates challenge statistics by fetching fresh data and caching it
 */
export async function updateChallengeStatistics(levelId: string): Promise<ChallengeStatistics | null> {
  const stats = await fetchChallengeStatistics(levelId);
  if (stats) {
    saveChallengeStatistics(levelId, stats);
  }
  return stats;
}

