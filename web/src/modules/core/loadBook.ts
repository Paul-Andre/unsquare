"use strict";

import { Book, BookNavigation } from './Book.ts';
import { Level } from './Level.ts';
import { book_reviver, reindexLevels } from './bookUtils.ts';
import { DAILY_UNLOCK_HOUR, DAILY_LEVELS_START_DATE } from '../utils/config.ts';
import mainBookData from '../../data/2025_nov_11_reordered_solved_fixed_all_solutions.json';
import dailyLevelsData from '../../data/daily_levels_24_dec_2025_exhaustive.json';
import { assert } from '../utils/helpers.ts';
import { getPurchasedProducts } from 'modules/utils/stripe.ts';
import { onAuthStateChange } from 'modules/utils/auth.ts';
import { Signal } from 'modules/utils/Signal.ts';

const PREVIOUS_OBJECT: BookNavigation = {
      action: "offerDailyWeeklyArchive",
      continuations: [
        "goToWeeklyArchive",
      ],
    }
// const PREVIOUS_OBJECT = undefined; 

async function refreshArchiveAccess(): Promise<void> {
  let products;
  try {
    products = await getPurchasedProducts();
  } catch (error) {
    console.log("Failed to fetch purchased products.", error);
    return;
  }
  if (products.dailyWeeklyArchive || products.fullAccess) {
    archiveAccessSignal.set(true);
  }
}

onAuthStateChange((user) => {
  refreshArchiveAccess();
});


const NUM_DAILY_LEVELS_PREVIEW = 7;
const NUM_WEEKLY_CHALLENGES_PREVIEW = 3;

const archiveAccessSignal = new Signal(false);

export const dailyLevelsBookSignal = new Signal(getDailyLevelsBook());
export const weeklyChallengesBookSignal = new Signal(getWeeklyChallengesBook());


archiveAccessSignal.on(_ => {
  console.log("setting books", archiveAccessSignal.get());
  dailyLevelsBookSignal.set(getDailyLevelsBook());
  weeklyChallengesBookSignal.set(getWeeklyChallengesBook());
});



/**
 * Calculate which daily level index to show based on current date and unlock time
 * Returns the index of the level to display (today's if unlocked, yesterday's if locked)
 */
function getDailyLevelIndex(totalLevels: number): number {
  assert(totalLevels > 0);
  const now = new Date();
  const currentHour = now.getHours();
  
  // Set both dates to midnight for accurate day calculation
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDate = new Date(
    DAILY_LEVELS_START_DATE.getFullYear(),
    DAILY_LEVELS_START_DATE.getMonth(),
    DAILY_LEVELS_START_DATE.getDate()
  );
  const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // If current time is before unlock hour, show yesterday's level
  const daysOffset = daysSinceStart - (currentHour < DAILY_UNLOCK_HOUR ? 1 : 0);
  
  if (daysOffset < 0) {
    return 0;
  }
  if (daysOffset >= totalLevels) {
    return totalLevels - 1;
  }
  return daysOffset
}

function getDailyLevelsFirstIndex(lastIndex:number): number {
  if (archiveAccessSignal.get()) return 0;
  return Math.max(0, lastIndex-NUM_DAILY_LEVELS_PREVIEW+1);
}

/**
 * Get the daily levels book
 * Returns last 7 levels including today's, or all levels if user has archive access
 */
function getDailyLevelsBook(): Book {
  // Load all daily levels
  const allLevels = (JSON.parse(JSON.stringify(dailyLevelsData), book_reviver) as Book).levels;
  const numLevels = allLevels.length;
  assert( numLevels > 0);

  let currentIndex = getDailyLevelIndex(numLevels);
  let firstIndex = getDailyLevelsFirstIndex(currentIndex);
  // Extract the levels and set their names
  const selectedLevels: Level[] = [];
  for (let i = firstIndex; i <= currentIndex; i++) {
    const level = allLevels[i].clone();
    level.shortName = `Daily #${i + 1}`;
    level.longName = `Daily Level #${i + 1}`;
    selectedLevels.push(level);
  }

  reindexLevels(selectedLevels);
  
  return {
    id: "daily",
    title: "Unflip Daily Levels",
    source: "daily",
    levels: selectedLevels,
    ...(firstIndex==0)?{}:{previous: PREVIOUS_OBJECT},
    fullAmount: currentIndex + 1,
  };
}

/**
 * Get the weekly challenge levels book
 * Returns last 2 weekly levels, or all levels if user has archive access
 */
function getWeeklyChallengesBook(): Book {
  // Embedded weekly levels data
  const challengeBookJson = {
    levels: [
      {
        colorScheme: "BW",
        tileShape: "square",
        tiles: [[1,2,2,1,2,2,1,2,2,1],[2,1,1,2,1,1,2,1,1,2],[2,1,1,2,1,1,2,1,1,2],[1,2,2,1,2,2,1,2,2,1],[2,1,1,2,1,1,2,1,1,2],[2,1,1,2,1,1,2,1,1,2],[1,2,2,1,2,2,1,2,2,1],[2,1,1,2,1,1,2,1,1,2],[2,1,1,2,1,1,2,1,1,2],[1,2,2,1,2,2,1,2,2,1]],
        mode: "challenge",
        title: "Weekly #1",
        id: "level_1763668451541",
        __type__: "Level"
      },
      {
        colorScheme: "BW",
        tileShape: "square",
        tiles: [[1,1,1,2,2,2,2,1,1,1],[1,1,2,2,2,2,2,2,1,1],[1,1,2,2,2,2,2,2,2,1],[1,2,2,2,2,2,2,1,2,2],[2,2,1,2,2,2,1,2,1,2],[2,1,2,1,2,2,2,1,2,2],[2,2,1,2,2,2,2,2,2,1],[1,2,2,2,2,2,2,2,1,1],[1,1,2,2,2,2,2,2,1,1],[1,1,1,2,2,2,2,1,1,1]],
        id: "level_1109238056389808",
        mode: "challenge",
        title: "Weekly #2",
        __type__: "Level"
      },
      {
        colorScheme: "BW",
        tileShape: "square",
        tiles: [[1,1,1,1,2,2,2,1,1,1,1],[1,1,1,1,1,2,1,1,1,1,1],[1,1,2,2,2,2,2,2,2,1,1],[1,1,1,2,1,1,1,2,1,1,1],[1,1,1,2,1,1,1,2,1,1,1],[1,2,2,2,2,2,2,2,2,2,1],[1,1,2,1,1,2,1,1,2,1,1],[1,1,2,1,1,2,1,1,2,1,1],[1,2,2,2,2,2,2,2,2,2,1],[1,2,1,1,1,2,1,1,1,2,1],[1,2,1,1,1,2,1,1,1,2,1]],
        mode: "challenge",
        id: "level_9159232684496334",
        __type__: "Level",
        title: "Weekly #3",
      },
      {
        colorScheme: "BW",
        tileShape: "square",
        tiles: [[1,1,2,1,1,1,1,1,2,1,1],[1,2,1,2,1,1,1,2,1,2,1],[2,1,2,1,2,1,2,1,2,1,2],[1,2,1,1,1,2,1,1,1,2,1],[1,1,2,1,2,1,2,1,2,1,1],[1,1,1,2,1,2,1,2,1,1,1],[1,1,2,1,2,1,2,1,2,1,1],[1,2,1,1,1,2,1,1,1,2,1],[2,1,2,1,2,1,2,1,2,1,2],[1,2,1,2,1,1,1,2,1,2,1],[1,1,2,1,1,1,1,1,2,1,1]],
        mode: "challenge",
        id: "level_1184501746690094",
        title: "Weekly #4",
        __type__: "Level",
      },
      {
        colorScheme: "BW",
        tileShape: "square",
        tiles: [[1,1,1,1,1,2,1,1,1,1,1],[1,1,1,1,1,2,1,1,1,1,1],[1,1,1,1,2,2,2,1,1,1,1],[1,1,1,1,2,2,2,1,1,1,1],[1,1,1,2,2,2,2,2,1,1,1],[1,1,1,2,2,2,2,2,1,1,1],[1,1,2,2,2,2,2,2,2,1,1],[1,1,2,2,2,2,2,2,2,1,1],[1,2,2,2,2,2,2,2,2,2,1],[1,1,2,2,2,2,2,2,2,1,1],[1,1,1,1,1,2,1,1,1,1,1]],
        id: "level_3720617583694259",
        mode: "challenge",
        title: "Weekly #5",
        __type__: "Level"
      },
      {
        colorScheme: "BW",
        tileShape: "square",
        tiles: [[1,1,1,1,1,2,1,1,1,1,1],[1,1,1,2,1,1,1,2,1,1,1],[1,1,1,1,1,1,1,1,1,1,1],[1,2,1,1,1,1,1,1,1,2,1],[1,1,1,1,1,2,1,1,1,1,1],[2,1,1,1,2,1,2,1,1,1,2],[1,1,1,1,1,2,1,1,1,1,1],[1,2,1,1,1,1,1,1,1,2,1],[1,1,1,1,1,1,1,1,1,1,1],[1,1,1,2,1,1,1,2,1,1,1],[1,1,1,1,1,2,1,1,1,1,1]],
        id: "level_2022701781412438",
        mode: "challenge",
        title: "Weekly #6A",
        __type__: "Level",
      },

      {"colorScheme":"BW",
        "tileShape":"square",
        "tiles":[[1,1,1,1,1,1,1,1,1,1,1],[1,1,1,1,1,2,1,1,1,1,1],[1,1,2,1,1,1,1,1,2,1,1],[1,1,1,1,1,1,1,1,1,1,1],[1,1,1,1,1,2,1,1,1,1,1],[1,2,1,1,2,1,2,1,1,2,1],[1,1,1,1,1,2,1,1,1,1,1],[1,1,1,1,1,1,1,1,1,1,1],[1,1,2,1,1,1,1,1,2,1,1],[1,1,1,1,1,2,1,1,1,1,1],[1,1,1,1,1,1,1,1,1,1,1]],
        "id":"level_6629065214232752",
        "__type__":"Level",
         mode: "challenge",
      title: "Weekly #6B",},
        {
        "colorScheme":"BW",
        "tileShape":"square",
        "tiles":[[1,1,1,2,1,1,2,1,1,1],[1,2,1,1,2,2,1,1,2,1],[1,1,2,2,1,1,2,2,1,1],[2,1,2,1,2,2,1,2,1,2],[1,2,1,2,2,2,2,1,2,1],[1,2,1,2,2,2,2,1,2,1],[2,1,2,1,2,2,1,2,1,2],[1,1,2,2,1,1,2,2,1,1],[1,2,1,1,2,2,1,1,2,1],[1,1,1,2,1,1,2,1,1,1]],
        "mode":"challenge",
        "id":"level_562439116575121",
        "__type__":"Level",
        title: "Weekly #7",
      }, 
    ],
    source: "challenge",
    id: "weekly",
    title: "Weekly Challenges",
  };
  
  const weeklyBook = JSON.parse(JSON.stringify(challengeBookJson), book_reviver);
  
  if (archiveAccessSignal.get()) {
    return weeklyBook;
  }
  
  const allLevels = weeklyBook.levels;
  const lastTwoLevels = allLevels.slice(-NUM_WEEKLY_CHALLENGES_PREVIEW);
  reindexLevels(lastTwoLevels);

  return {
    id: "weekly",
    title: "Unflip Weekly Challenges",
    source: "challenge",
    levels: lastTwoLevels,
    previous: PREVIOUS_OBJECT,
    fullAmount: allLevels.length,
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
