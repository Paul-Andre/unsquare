"use strict";

import { assert, cast } from '../utils/helpers.ts';
import { LevelIconGrid } from '../ui/LevelIconGrid.tsx';
import { calculateLevelState, applyStateClass, LEVEL_STATES } from '../ui/levelStateUtils.ts';
import { createLevelIcon, updateLevelIconState } from '../ui/LevelIcon.tsx';
import { appContext } from '../core/AppContext.ts';
import { book_reviver } from '../core/bookUtils.ts';
import { Level } from '../core/Level.ts';
import { supabase } from '../utils/api.ts';
import { getCachedChallengeStatistics, saveChallengeStatistics } from '../core/levelUtils.ts';
import mainBookData from '../../data/2025_nov_11_reordered_solved_fixed_all_solutions.json';
import dailyLevelsData from '../../data/daily_submitting_07_dec_exhaustive.json'
import { DAILY_UNLOCK_HOUR, DAILY_LEVELS_START_DATE } from '../utils/config.ts';
import { ChallengeStatistics } from '../core/levelUtils.ts';
import { Book } from '../core/Book.ts';



export class GameLevelMenu {
  root: HTMLElement;
  bookUrl: string;
  dailyLevels: Level[];
  weeklyChallengeBook: Book;
  weeklyChallengeLevel: Level;
  levelMenu: LevelIconGrid;
  
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

    this.loadBook();
  }

  onShow() {
    this.levelMenu.onShow();
    this.displayDailyIcon();
    this.updateChallengeStatistics();
  }


  loadBook() {
    try {
      // Convert imported JSON data using book_reviver
      const data = JSON.parse(JSON.stringify(mainBookData), book_reviver);
      data.source = this.bookUrl;

      this.levelMenu.openBook(data);

      this.levelMenu.displayIcons();
      this.displayDailyIcon();
      this.displayChallengeIcon();
    } catch (e) {
      //alert("Error loading levels");
      console.error(e);
    }
  }


  async fetchChallengeStatistics() {
    const player_id = localStorage.player_id;
    if (!player_id) {
      return null;
    }

    try {
      const { data, error } = await supabase.rpc('get_player_level_summary', {
        p_player_id: player_id,
        p_level_id: this.weeklyChallengeLevel.id
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

  updateChallengeStatisticsDisplay(stats: ChallengeStatistics) {
    const youEl = this.root.querySelector("#challengeStatYou");
    const topEl = this.root.querySelector("#challengeStatTop");
    const rankEl = this.root.querySelector("#challengeStatRank");
    const iconEl = this.root.querySelector("#challengeIconContainer .level_icon");

    if (!youEl || !topEl || !rankEl || !iconEl || !(iconEl instanceof HTMLElement)) {
      return;
    }

    if (!stats) {
      const cached = getCachedChallengeStatistics(this.weeklyChallengeLevel.id);
      const totalPlayers = cached?.total_players;
      youEl.textContent = "you: -";
      topEl.textContent = "top: ?";
      rankEl.textContent = totalPlayers ? `rank: -/${totalPlayers}` : "rank: -/-";
      updateLevelIconState(iconEl, LEVEL_STATES.UNSOLVED);
      return;
    }

    const playerBest = stats.player_best ?? null;
    const topBest = stats.top_best ?? null;
    const rank = stats.rank ?? null;
    const totalPlayers = stats.total_players ?? null;

    youEl.textContent = playerBest !== null ? `you: ${playerBest}` : "you: -";
    topEl.textContent = topBest !== null ? `top: ${topBest}` : "top: ?";
    rankEl.textContent = rank !== null && totalPlayers !== null 
      ? `rank: ${rank}/${totalPlayers}` 
      : `rank: -/${totalPlayers ?? "-"}`;

    if (playerBest === null) {
      updateLevelIconState(iconEl, LEVEL_STATES.UNSOLVED);
    } else if (topBest !== null && playerBest === topBest) {
      updateLevelIconState(iconEl, LEVEL_STATES.OPTIMAL);
    } else {
      updateLevelIconState(iconEl, LEVEL_STATES.SUBOPTIMAL);
    }
  }

  async updateChallengeStatistics() {
    // Display cached statistics immediately
    const cachedStats = getCachedChallengeStatistics(this.weeklyChallengeLevel.id);
    if (cachedStats) {
      this.updateChallengeStatisticsDisplay(cachedStats);
    }

    // Fetch fresh statistics
    const stats = await this.fetchChallengeStatistics();
      if (stats) {
      saveChallengeStatistics(this.weeklyChallengeLevel.id, stats);
      this.updateChallengeStatisticsDisplay(stats);
    }
  }

  displayChallengeIcon() {
    const iconSlot = this.root.querySelector("#challengeIconContainer .icon_slot");
    const heading = this.root.querySelector("#weeklyChallengeHeading");
    
    if (!iconSlot) {
      return;
    }

    // Update heading with longName
    if (heading) {
      heading.textContent = (this.weeklyChallengeLevel.longName || "Weekly Challenge") + ":";
    }

    iconSlot.innerHTML = "";
    
    const iconElement = createLevelIcon({
      level: this.weeklyChallengeLevel,
      state: LEVEL_STATES.UNSOLVED,
      onClick: () => {
        appContext.playLevel(this.weeklyChallengeLevel, this.weeklyChallengeBook);
      },
    });
    
    iconSlot.appendChild(iconElement);
    this.updateChallengeStatistics();
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
