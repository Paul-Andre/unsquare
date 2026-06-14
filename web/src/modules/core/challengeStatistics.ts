"use strict";

import { supabase } from '../utils/api.ts';
import { saveChallengeStatistics } from './levelUtils.ts';
import { storage } from './storage.ts';

export type ChallengeStatistics = {
  player_best: number;
  top_best: number;
  rank: number;
  total_players: number;
}

export function parseChallengeStatistics(data: any): ChallengeStatistics {
  return {
    player_best: data.player_best,
    top_best: data.top_best,
    rank: data.rank,
    total_players: data.total_players,
  }
}

/**
 * Fetches challenge statistics for a given level from Supabase
 */
export async function fetchChallengeStatistics(levelId: string): Promise<ChallengeStatistics | null> {
  const player_id = storage.getPlayerId();
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

    return parseChallengeStatistics(data);
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

