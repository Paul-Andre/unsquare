
// TODO: perhaps I should move these functions to a new file called something like "storage"

// "lsk" = local storage key
// Best moves storage methods
export function getLskForBestNumMoves(level) {
  return level.getFullIdentifier() + " bestNumMoves";
}

export function getBestNumMoves(level) {
  let sol = localStorage.getItem(getLskForBestNumMoves(level));
  if (sol === null) return null;
  return Number(sol);
}

export function setBestNumMoves(level, num) {
  localStorage.setItem(getLskForBestNumMoves(level), num);
}

export function clearBestNumMoves(level) {
  localStorage.removeItem(getLskForBestNumMoves(level));
}

// Challenge statistics storage methods
export function getChallengeStatsCacheKey(levelId) {
  return `challenge_stats_${levelId}`;
}

export function getCachedChallengeStatistics(levelId) {
  const cached = localStorage.getItem(getChallengeStatsCacheKey(levelId));
  if (!cached) return null;
  try {
    return JSON.parse(cached);
  } catch (e) {
    return null;
  }
}

export function saveChallengeStatistics(levelId, stats) {
  localStorage.setItem(getChallengeStatsCacheKey(levelId), JSON.stringify(stats));
}
