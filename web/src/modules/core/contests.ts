import { supabase } from "modules/utils/api";
import { ensureNotNull } from "modules/utils/helpers";
import { appStorage } from "./appStorage";

function getCurrentContestIdFromUrl(): string | null {
  const contestId = new URLSearchParams(window.location.search).get("contest")?.trim() ?? null;
  if (contestId !== null && contestId.length > 0) {
    return contestId;
  }
  return null;
}

let currentContestId = getCurrentContestIdFromUrl();

export function getCurrentContestId(): string | null {
    return currentContestId;
}

export async function submitParticipantName(name: string): Promise<void> {
    if (currentContestId === null) {
        console.warn("No current contest ID; cannot submit participant name.");
        return;
    }


    // Submit to Supabase using the SQL function
    const playerId = ensureNotNull(appStorage.getPlayerId());
    const { error } = await supabase.rpc('submit_participant_name', {
        p_contest_hashid: currentContestId,
        p_player_id: playerId,
        p_name: name
    });
    if (error) {
        console.error("Error submitting participant name:", error);
        throw error;
    }

    appStorage.setParticipantName(name);
}