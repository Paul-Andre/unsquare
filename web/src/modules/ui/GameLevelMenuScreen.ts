"use strict";

import { assert, cast } from '../utils/helpers.ts';
import { LevelIconGrid } from '../ui/LevelIconGrid.tsx';
import { calculateLevelState, applyStateClass, LEVEL_STATES } from '../ui/levelStateUtils.ts';
import { createLevelIcon } from '../ui/LevelIcon.tsx';
import { appContext } from '../core/AppContext.ts';
import { book_reviver } from '../core/bookUtils.ts';
import { Level } from '../core/Level.ts';
import mainBookData from '../../data/2025_nov_11_reordered_solved_fixed_all_solutions.json';
import dailyLevelsData from '../../data/daily_submitting_07_dec_exhaustive.json'
import { DAILY_UNLOCK_HOUR, DAILY_LEVELS_START_DATE } from '../utils/config.ts';
import { Book } from '../core/Book.ts';
import { createWeeklyChallengeCard } from '../ui/WeeklyChallengeCard.tsx';



export class GameLevelMenuScreen {
  root: HTMLElement;
  bookUrl: string;
  dailyLevels: Level[];
  weeklyChallengeBook: Book;
  weeklyChallengeLevel: Level;
  levelMenu: LevelIconGrid;
  weeklyChallengeCardContainer: HTMLElement | null = null;
  
  constructor(root: HTMLElement) {
    this.root = root;
    this.bookUrl = "../../data/2025_nov_11_reordered_solved_fixed_all_solutions.json";
    
    // Load daily levels
    this.dailyLevels = JSON.parse(JSON.stringify(dailyLevelsData), book_reviver).levels || [];

    const challengeBookJson = {
      levels: [
    // {
    //   "colorScheme": "BW",
    //   "tileShape": "square",
    //   "tiles": [[1,2,2,1,2,2,1,2,2,1],[2,1,1,2,1,1,2,1,1,2],[2,1,1,2,1,1,2,1,1,2],[1,2,2,1,2,2,1,2,2,1],[2,1,1,2,1,1,2,1,1,2],[2,1,1,2,1,1,2,1,1,2],[1,2,2,1,2,2,1,2,2,1],[2,1,1,2,1,1,2,1,1,2],[2,1,1,2,1,1,2,1,1,2],[1,2,2,1,2,2,1,2,2,1]],
    //   "mode": "challenge",
    //   "title": "Weekly #1",
    //   "index": 0,
    //   "id": "level_1763668451541",
    //   "__type__": "Level"
    // };
    // {
    //   "colorScheme":"BW",
    //   "tileShape":"square",
    //   "tiles":[[1,1,1,2,2,2,2,1,1,1],[1,1,2,2,2,2,2,2,1,1],[1,1,2,2,2,2,2,2,2,1],[1,2,2,2,2,2,2,1,2,2],[2,2,1,2,2,2,1,2,1,2],[2,1,2,1,2,2,2,1,2,2],[2,2,1,2,2,2,2,2,2,1],[1,2,2,2,2,2,2,2,1,1],[1,1,2,2,2,2,2,2,1,1],[1,1,1,2,2,2,2,1,1,1]],
    //   "id":"level_1109238056389808",
    //   "mode": "challenge",
    //   "title": "Weekly #2",
    //   "index": 0,
    //   "__type__":"Level"
    // };
    // {
    //   "colorScheme":"BW",
    //   "tileShape":"square",
    //   "tiles":[[1,1,1,1,2,2,2,1,1,1,1],[1,1,1,1,1,2,1,1,1,1,1],[1,1,2,2,2,2,2,2,2,1,1],[1,1,1,2,1,1,1,2,1,1,1],[1,1,1,2,1,1,1,2,1,1,1],[1,2,2,2,2,2,2,2,2,2,1],[1,1,2,1,1,2,1,1,2,1,1],[1,1,2,1,1,2,1,1,2,1,1],[1,2,2,2,2,2,2,2,2,2,1],[1,2,1,1,1,2,1,1,1,2,1],[1,2,1,1,1,2,1,1,1,2,1]],
    //   "mode":"challenge",
    //   "id":"level_9159232684496334",
    //   "__type__":"Level",
    //   "title": "Weekly #3",
    // },
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
    id: "challenge",
    title: "Weekly Challenge",
  }

    this.weeklyChallengeBook = JSON.parse(JSON.stringify(challengeBookJson), book_reviver);
    this.weeklyChallengeLevel = this.weeklyChallengeBook.levels.at(-1)!;


    const iconContainer = cast(root.querySelector("#iconContainer"), HTMLElement);
    this.levelMenu = new LevelIconGrid(iconContainer, false, {
      onIconClick: (level: Level, element: HTMLElement) => {
        if (this.levelMenu.book !== null) {
          appContext.playLevel(level, this.levelMenu.book);
        }
      },
    });

    this.weeklyChallengeCardContainer = root.querySelector("#weeklyChallengCardContainer");

    this.loadBook();
  }

  onShow() {
    this.levelMenu.onShow();
    this.displayDailyIcon();
  }


  loadBook() {
    try {
      // Convert imported JSON data using book_reviver
      const data = JSON.parse(JSON.stringify(mainBookData), book_reviver);
      data.source = this.bookUrl;

      this.levelMenu.openBook(data);

      this.levelMenu.displayIcons();
      this.displayDailyIcon();
      
      // Create weekly challenge card
      if (this.weeklyChallengeCardContainer) {
        createWeeklyChallengeCard({
          level: this.weeklyChallengeLevel,
          book: this.weeklyChallengeBook,
          container: this.weeklyChallengeCardContainer,
        });
      }
    } catch (e) {
      //alert("Error loading levels");
      console.error(e);
    }
  }

  /**
   * Calculate which daily level index to show based on current date and unlock time
   * Returns the index of the level to display (today's if unlocked, yesterday's if locked)
   */
  getDailyLevelIndex() {
    if (this.dailyLevels.length === 0) {
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
      return daysOffset % this.dailyLevels.length;
    }
  }

  /**
   * Get the current daily level to display
   */
  getCurrentDailyLevel() {
    const index = this.getDailyLevelIndex();
    if (index === null || index >= this.dailyLevels.length) {
      return null;
    }

    const level = this.dailyLevels[index].clone();
    
    // Set shortName to "Daily #X" where X is index + 1
    level.shortName = `Daily #${index + 1}`;
    level.longName = `Daily Level #${index + 1}`
    level.index = 0;
    
    return level;
  }

  displayDailyIcon() {
    const iconSlot = this.root.querySelector("#dailyIconContainer .icon_slot");
    const heading = this.root.querySelector("#dailyLevelHeading");
    
    if (!iconSlot || !heading) {
      return;
    }

    const dailyLevel = this.getCurrentDailyLevel();
    if (!dailyLevel) {
      return;
    }

    heading.textContent = dailyLevel.longName;

    iconSlot.innerHTML = "";
    
    const state = calculateLevelState(dailyLevel);
    const iconElement = createLevelIcon({
      level: dailyLevel,
      state,
      onClick: () => {
        appContext.playLevel(dailyLevel, {
          levels: [dailyLevel],
          source: "daily",
          id: "daily",
          title: "Daily Level",
        });
      },
    });
    
    iconSlot.appendChild(iconElement);
  }
}
