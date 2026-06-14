import { ChallengeStatistics } from "./levelUtils";

export type Histogram = Record<number, number>;
export type AllHistogramData = {
  allSolutions: Histogram;
  bestPerPlayer: Histogram;
  uniqueSolutions: Histogram;
}

export type HistogramsAndSummary = {
  histogram: AllHistogramData;
  player_summary: ChallengeStatistics;
}

export function parseHistogramsAndSummary(data: any): HistogramsAndSummary {
  return {
    histogram: data.histogram,
    player_summary: data.player_summary,
  }
}

export function parseAllHistogramDataKey(key: string): keyof AllHistogramData {
  if (key === "allSolutions" || key === "bestPerPlayer" || key === "uniqueSolutions") {
    return key as keyof AllHistogramData;
  }
  throw new Error(`Invalid key: ${key}`);
}