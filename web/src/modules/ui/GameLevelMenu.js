"use strict";

import { LevelMenuComponent, calculateLevelState, applyStateClass } from './LevelMenuComponent.js';
import { screenManager } from './ScreenManager.js';
import { book_reviver } from '../core/bookUtils.js';
import { Level } from '../core/Level.js';
import { getCachedLevelIconDataUrl } from './icon.js';
import { htmlStringToElement } from '../utils/helpers.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../utils/api.js';
import { getCachedChallengeStatistics, saveChallengeStatistics } from '../core/levelUtils.js';
import mainBookData from '../../data/2025_nov_11_reordered_solved_fixed_all_solutions.json';
import dailyLevelsData from '../../data/daily_submitting_07_dec_exhaustive.json'
import { DAILY_UNLOCK_HOUR, DAILY_LEVELS_START_DATE, ICON_SIZE } from '../utils/config.js';

export class GameLevelMenu {
  constructor() {
    this.bookUrl = "data/2025_nov_11_reordered_solved_fixed.json";
    
    // Load daily levels
    this.dailyLevels = JSON.parse(JSON.stringify(dailyLevelsData), book_reviver).levels || [];

    const challengeLevelJson =
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
    {
      "colorScheme":"BW",
      "tileShape":"square",
      "tiles":[[1,1,1,1,2,2,2,1,1,1,1],[1,1,1,1,1,2,1,1,1,1,1],[1,1,2,2,2,2,2,2,2,1,1],[1,1,1,2,1,1,1,2,1,1,1],[1,1,1,2,1,1,1,2,1,1,1],[1,2,2,2,2,2,2,2,2,2,1],[1,1,2,1,1,2,1,1,2,1,1],[1,1,2,1,1,2,1,1,2,1,1],[1,2,2,2,2,2,2,2,2,2,1],[1,2,1,1,1,2,1,1,1,2,1],[1,2,1,1,1,2,1,1,1,2,1]],
      "mode":"challenge",
      "id":"level_9159232684496334",
      "__type__":"Level",
      "title": "Weekly #3",
      "index": 0
    };

    this.weeklyChallengeLevel = Level.fromJsonObject(challengeLevelJson);
    
    // Delay the creation of level menu until after game is ready
    this.initializeLevelMenu();

    this.loadBook();
  }

  initializeLevelMenu() {
    // Wait for game to be available
    if (window.game) {
      this.levelMenu = new LevelMenuComponent("gameLevelMenu", false);
      screenManager.additionalFunctions.gameLevelMenu = this.levelMenu;
      // Add onShow callback to refresh challenge statistics and daily icon
      const originalOnShow = this.levelMenu.onShow;
      this.levelMenu.onShow = () => {
        if (originalOnShow) {
          originalOnShow.call(this.levelMenu);
        }
        this.displayDailyIcon();
        this.updateChallengeStatistics();
      };
    } else {
      // Retry after a short delay
      setTimeout(() => this.initializeLevelMenu(), 100);
    }
  }


  loadBook() {
    try {
      // Convert imported JSON data using book_reviver
      let data = JSON.parse(JSON.stringify(mainBookData), book_reviver);
      data.source = this.bookUrl;

      this.levelMenu.openBook(data);

      let button = document.getElementById("homePlayButton");
      button.removeAttribute("disabled");
      button.innerText = "Start Game!";

      // if ?reset added at the end of the url, reset the bests
      let resetUrlParam = new URLSearchParams(location.search).get("reset");
      if (resetUrlParam !== null) {
        this.levelMenu.clearAllBests();
      }
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
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_player_level_summary`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          p_player_id: player_id,
          p_level_id: this.weeklyChallengeLevel.id
        })
      });

      console.log("response", response);

      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`);
        return null;
      }

      return await response.json();
    } catch (e) {
      console.error("Failed to fetch challenge statistics", e);
      return null;
    }
  }

  updateChallengeStatisticsDisplay(stats) {
    const youEl = document.getElementById("challengeStatYou");
    const topEl = document.getElementById("challengeStatTop");
    const rankEl = document.getElementById("challengeStatRank");
    const iconEl = document.querySelector("#challengeIconContainer .level_icon");

    if (!youEl || !topEl || !rankEl || !iconEl) {
      return;
    }

    iconEl.classList.remove("icon_unsolved", "icon_suboptimal", "icon_optimal");

    if (!stats) {
      const cached = getCachedChallengeStatistics(this.weeklyChallengeLevel.id);
      const totalPlayers = cached?.total_players;
      youEl.textContent = "you: -";
      topEl.textContent = "top: ?";
      rankEl.textContent = totalPlayers ? `rank: -/${totalPlayers}` : "rank: -/-";
      iconEl.classList.add("icon_unsolved");
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
      iconEl.classList.add("icon_unsolved");
    } else if (topBest !== null && playerBest === topBest) {
      iconEl.classList.add("icon_optimal");
    } else {
      iconEl.classList.add("icon_suboptimal");
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
    console.log("stats", stats);
    if (stats) {
      saveChallengeStatistics(this.weeklyChallengeLevel.id, stats);
      this.updateChallengeStatisticsDisplay(stats);
    }
  }

  displayChallengeIcon() {
    const container = document.getElementById("challengeIconContainer");
    if (!container) {
      return;
    }

    let element = /** @type {HTMLElement} */ (container.querySelector(".level_icon"));
    const iconImg = /** @type {HTMLImageElement} */ (element.querySelector(".level_icon_image"));
    if (iconImg) {
      const dataURL = getCachedLevelIconDataUrl(this.weeklyChallengeLevel);
      iconImg.src = dataURL;
      iconImg.style.width = `${ICON_SIZE}px`;
      iconImg.style.height = `${ICON_SIZE}px`;
    }

    /** @type {any} */ (element).level = this.weeklyChallengeLevel;
    element.onclick = () => {
      if (window.game?.openLevel) {
        window.game.openLevel(this.weeklyChallengeLevel, {
          levels: [this.weeklyChallengeLevel],
          source: "challenge",
        });
        screenManager.switchTo("game");
      }
    };

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
    
    // Set title to "Daily #X" where X is index + 1
    level.title = `Daily #${index + 1}`;
    level.index = 0;
    
    return level;
  }

  displayDailyIcon() {
    const container = document.getElementById("dailyIconContainer");
    const heading = document.getElementById("dailyLevelHeading");
    
    if (!container || !heading) {
      return;
    }

    const dailyLevel = this.getCurrentDailyLevel();
    if (!dailyLevel) {
      return;
    }

    // Update heading with level number (index + 1)
    const levelNumber = dailyLevel.index + 1;
    heading.textContent = `Daily Level #${levelNumber}:`;

    let element = /** @type {HTMLElement} */ (container.querySelector(".level_icon"));
    if (!element) {
      return;
    }

    const iconImg = /** @type {HTMLImageElement} */ (element.querySelector(".level_icon_image"));
    if (iconImg) {
      const dataURL = getCachedLevelIconDataUrl(dailyLevel);
      iconImg.src = dataURL;
      iconImg.style.width = `${ICON_SIZE}px`;
      iconImg.style.height = `${ICON_SIZE}px`;
    }

    /** @type {any} */ (element).level = dailyLevel;
    element.onclick = () => {
      if (window.game?.openLevel) {
        window.game.openLevel(dailyLevel, {
          levels: [dailyLevel],
          source: "daily",
        });
        screenManager.switchTo("game");
      }
    };

    // Apply state-based CSS class
    const state = calculateLevelState(dailyLevel);
    applyStateClass(element, state);
  }
}

// Create global instance
export const gameLevelMenu = new GameLevelMenu();
