"use strict";

import { Book } from './Book.ts';
import { Level } from './Level.ts';
import { book_reviver, reindexLevels } from './bookUtils.ts';
import { DAILY_UNLOCK_HOUR, DAILY_LEVELS_START_DATE } from '../utils/config.ts';
import mainBookData from '../../data/2025_nov_11_reordered_solved_fixed_all_solutions.json';
import dailyLevelsData from '../../data/daily_submitting_07_dec_exhaustive.json';

/**
 * Placeholder function for future authorization logic
 * Returns whether the user has purchased access to the archive
 */
export function userHasArchiveAccess(): boolean {
  return false;
}

/**
 * Calculate which daily level index to show based on current date and unlock time
 * Returns the index of the level to display (today's if unlocked, yesterday's if locked)
 */
function getDailyLevelIndex(totalLevels: number): number | null {
  if (totalLevels === 0) {
    return null;
  }

  const now = new Date();
  const currentHour = now.getHours();
  
  // Set both dates to midnight for accurate day calculation
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDate = new Date(DAILY_LEVELS_START_DATE.getFullYear(), DAILY_LEVELS_START_DATE.getMonth(), DAILY_LEVELS_START_DATE.getDate());
  const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // If current time is before unlock hour, show yesterday's level
  const daysOffset = daysSinceStart - (currentHour < DAILY_UNLOCK_HOUR ? 1 : 0);
  
  if (daysOffset < 0) {
    return 0;
  } else {
    return daysOffset % totalLevels;
  }
}

/**
 * Get the daily levels book
 * Returns last 7 levels including today's, or all levels if user has archive access
 */
export function getDailyLevelsBook(): Book {
  // Load all daily levels
  const allLevels = JSON.parse(JSON.stringify(dailyLevelsData), book_reviver).levels || [];
  
  if (userHasArchiveAccess()) {
    // Set names for all levels
    for (let i = 0; i < allLevels.length; i++) {
      allLevels[i].shortName = `Daily #${i + 1}`;
      allLevels[i].longName = `Daily Level #${i + 1}`;
    }
    
    return {
      id: "daily",
      title: "Daily Levels",
      source: "daily",
      levels: allLevels,
    };
  }
  
  // Calculate current daily level index
  const currentIndex = getDailyLevelIndex(allLevels.length);
  if (currentIndex === null) {
    return {
      id: "daily",
      title: "Daily Levels",
      source: "daily",
      levels: [],
    };
  }
  
  // Determine which levels to return (last 7 including today's, no wrap-around)
  let startIndex: number;
  let endIndex: number;
  
  if (currentIndex < 6) {
    // At the beginning: take available levels up to 7
    startIndex = 0;
    endIndex = Math.min(6, allLevels.length - 1);
  } else if (currentIndex >= allLevels.length - 7) {
    // At the end: take the last 7 levels
    startIndex = Math.max(0, allLevels.length - 7);
    endIndex = allLevels.length - 1;
  } else {
    // In the middle: take 7 levels centered around current
    startIndex = currentIndex - 6;
    endIndex = currentIndex;
  }
  
  // Extract the levels and set their names
  const selectedLevels: Level[] = [];
  for (let i = startIndex; i <= endIndex; i++) {
    const level = allLevels[i].clone();
    level.shortName = `Daily #${i + 1}`;
    level.longName = `Daily Level #${i + 1}`;
    selectedLevels.push(level);
  }

  reindexLevels(selectedLevels);
  
  return {
    id: "daily",
    title: "Daily Levels",
    source: "daily",
    levels: selectedLevels,
  };
}

/**
 * Get the weekly challenge levels book
 * Returns last 2 weekly levels, or all levels if user has archive access
 */
export function getWeeklyChallengesBook(): Book {
  // Embedded weekly levels data
  const challengeBookJson = {
    levels: [
      {
        "colorScheme": "BW",
        "tileShape": "square",
        "tiles": [[1,2,2,1,2,2,1,2,2,1],[2,1,1,2,1,1,2,1,1,2],[2,1,1,2,1,1,2,1,1,2],[1,2,2,1,2,2,1,2,2,1],[2,1,1,2,1,1,2,1,1,2],[2,1,1,2,1,1,2,1,1,2],[1,2,2,1,2,2,1,2,2,1],[2,1,1,2,1,1,2,1,1,2],[2,1,1,2,1,1,2,1,1,2],[1,2,2,1,2,2,1,2,2,1]],
        "mode": "challenge",
        "title": "Weekly #1",
        "index": 0,
        "id": "level_1763668451541",
        "__type__": "Level"
      },
      {
        "colorScheme":"BW",
        "tileShape":"square",
        "tiles":[[1,1,1,2,2,2,2,1,1,1],[1,1,2,2,2,2,2,2,1,1],[1,1,2,2,2,2,2,2,2,1],[1,2,2,2,2,2,2,1,2,2],[2,2,1,2,2,2,1,2,1,2],[2,1,2,1,2,2,2,1,2,2],[2,2,1,2,2,2,2,2,2,1],[1,2,2,2,2,2,2,2,1,1],[1,1,2,2,2,2,2,2,1,1],[1,1,1,2,2,2,2,1,1,1]],
        "id":"level_1109238056389808",
        "mode": "challenge",
        "title": "Weekly #2",
        "index": 0,
        "__type__":"Level"
      },
      {
        "colorScheme":"BW",
        "tileShape":"square",
        "tiles":[[1,1,1,1,2,2,2,1,1,1,1],[1,1,1,1,1,2,1,1,1,1,1],[1,1,2,2,2,2,2,2,2,1,1],[1,1,1,2,1,1,1,2,1,1,1],[1,1,1,2,1,1,1,2,1,1,1],[1,2,2,2,2,2,2,2,2,2,1],[1,1,2,1,1,2,1,1,2,1,1],[1,1,2,1,1,2,1,1,2,1,1],[1,2,2,2,2,2,2,2,2,2,1],[1,2,1,1,1,2,1,1,1,2,1],[1,2,1,1,1,2,1,1,1,2,1]],
        "mode":"challenge",
        "id":"level_9159232684496334",
        "__type__":"Level",
        "title": "Weekly #3",
      },
      {
        "colorScheme":"BW",
        "tileShape":"square",
        "tiles":[[1,1,2,1,1,1,1,1,2,1,1],[1,2,1,2,1,1,1,2,1,2,1],[2,1,2,1,2,1,2,1,2,1,2],[1,2,1,1,1,2,1,1,1,2,1],[1,1,2,1,2,1,2,1,2,1,1],[1,1,1,2,1,2,1,2,1,1,1],[1,1,2,1,2,1,2,1,2,1,1],[1,2,1,1,1,2,1,1,1,2,1],[2,1,2,1,2,1,2,1,2,1,2],[1,2,1,2,1,1,1,2,1,2,1],[1,1,2,1,1,1,1,1,2,1,1]],
        "mode":"challenge",
        "id":"level_1184501746690094",
        "title": "Weekly #4",
        "__type__":"Level",
      },
      {"colorScheme":"BW",
        "tileShape":"square",
        "tiles":[[1,1,1,1,1,2,1,1,1,1,1],[1,1,1,1,1,2,1,1,1,1,1],[1,1,1,1,2,2,2,1,1,1,1],[1,1,1,1,2,2,2,1,1,1,1],[1,1,1,2,2,2,2,2,1,1,1],[1,1,1,2,2,2,2,2,1,1,1],[1,1,2,2,2,2,2,2,2,1,1],[1,1,2,2,2,2,2,2,2,1,1],[1,2,2,2,2,2,2,2,2,2,1],[1,1,2,2,2,2,2,2,2,1,1],[1,1,1,1,1,2,1,1,1,1,1]],
        "id":"level_3720617583694259",
        "mode":"challenge",
        "title": "Weekly #5",
        "__type__":"Level",
      },
    ],
    source: "challenge",
    id: "weekly",
    title: "Weekly Challenges",
  };
  
  const weeklyBook = JSON.parse(JSON.stringify(challengeBookJson), book_reviver);
  
  if (userHasArchiveAccess()) {
    return weeklyBook;
  }
  
  // Return last 2 weekly levels
  const allLevels = weeklyBook.levels;
  const lastTwoLevels = allLevels.slice(-2);
  reindexLevels(lastTwoLevels);

  return {
    id: "weekly",
    title: "Weekly Challenges",
    source: "challenge",
    levels: lastTwoLevels,
  };
}

/**
 * Get the main book
 */
export function getMainBook(): Book {
  const data = JSON.parse(JSON.stringify(mainBookData), book_reviver);
  data.source = "../../data/2025_nov_11_reordered_solved_fixed_all_solutions.json";
  return data;
}
