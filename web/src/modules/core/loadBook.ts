"use strict";

import { Book, BookNavigation } from './Book.ts';
import { Level } from './Level.ts';
import { book_reviver, reindexLevels } from './bookUtils.ts';
import { DAILY_UNLOCK_HOUR, DAILY_LEVELS_START_DATE } from '../utils/config.ts';
import mainBookData from '../../data/2025_nov_11_reordered_solved_fixed_all_solutions.json';
import { assert } from '../utils/helpers.ts';
import { getPurchasedProducts } from 'modules/utils/stripe.ts';
import { onAuthStateChange } from 'modules/utils/auth.ts';
import { Signal } from 'modules/utils/Signal.ts';
import { cachedFetchSignal } from '../utils/cachedFetchSignal.ts';

const PREVIOUS_OBJECT: BookNavigation = {
      action: "offerDailyWeeklyArchive",
      continuations: [
        "goToWeeklyArchive",
      ],
    }
// const PREVIOUS_OBJECT = undefined; 

const NUM_DAILY_LEVELS_PREVIEW = 3;
const NUM_WEEKLY_CHALLENGES_PREVIEW = 3;

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



const archiveAccessSignal = new Signal(false);



const weeklyChallengesJsonSignal = cachedFetchSignal(
  null, 
   window.location.origin + "/api/weekly_challenges.json"
);

const dailyLevelsJsonSignal = cachedFetchSignal(
  null, 
   window.location.origin + "/api/daily_levels.json"
);

export const weeklyChallengesBookSignal = Signal.pipeline(
  getWeeklyChallengesBook,
  [archiveAccessSignal, weeklyChallengesJsonSignal]
)

export const dailyLevelsBookSignal: Signal<Book | null> = Signal.pipeline(
  getDailyLevelsBook,
  [archiveAccessSignal, dailyLevelsJsonSignal]
)

archiveAccessSignal.on(async _ => {
  console.log("setting books", archiveAccessSignal.get());
  dailyLevelsBookSignal.set(getDailyLevelsBook());
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
function getDailyLevelsBook(): Book | null {
  const dailyLevelsJson = dailyLevelsJsonSignal.get();
  if (dailyLevelsJson === null) return null;
  // Load all daily levels
  const allLevels = (JSON.parse(dailyLevelsJson, book_reviver) as Book).levels;
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

function getWeeklyChallengesBook(): Book|null {
  let weeklyChallengesJson = weeklyChallengesJsonSignal.get(); 

  if (weeklyChallengesJson === null) {
    return null;
  }
  
  const weeklyBook = JSON.parse(weeklyChallengesJson, book_reviver);
  
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
