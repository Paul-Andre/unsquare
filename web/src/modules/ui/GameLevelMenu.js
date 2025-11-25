"use strict";

import { LevelMenuComponent } from './LevelMenuComponent.js';
import { screenManager } from './ScreenManager.js';
import { book_reviver } from '../core/bookUtils.js';
import { Level } from '../core/Level.js';
import { createLevelIcon } from './icon.js';
import { htmlStringToElement } from '../utils/helpers.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../utils/api.js';
import mainBookData from '../../data/2025_nov_11_reordered_solved_fixed.json';
// import mainBookData from '../../data/tiny_for_testing.json';

export class GameLevelMenu {
  constructor() {
    this.bookUrl = "data/2025_nov_11_reordered_solved_fixed.json";

    const challengeLevelJson = {
      "colorScheme": "BW",
      "tileShape": "square",
      "tiles": [[1,2,2,1,2,2,1,2,2,1],[2,1,1,2,1,1,2,1,1,2],[2,1,1,2,1,1,2,1,1,2],[1,2,2,1,2,2,1,2,2,1],[2,1,1,2,1,1,2,1,1,2],[2,1,1,2,1,1,2,1,1,2],[1,2,2,1,2,2,1,2,2,1],[2,1,1,2,1,1,2,1,1,2],[2,1,1,2,1,1,2,1,1,2],[1,2,2,1,2,2,1,2,2,1]],
      "mode": "challenge",
      "title": "Weekly #1",
      "index": 0,
      "id": "level_1763668451541",
      "__type__": "Level"
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
      // Add onShow callback to refresh challenge statistics
      const originalOnShow = this.levelMenu.onShow;
      this.levelMenu.onShow = () => {
        if (originalOnShow) {
          originalOnShow.call(this.levelMenu);
        }
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
      this.displayChallengeIcon();
    } catch (e) {
      //alert("Error loading levels");
      console.error(e);
    }
  }

  getChallengeCacheKey() {
    return `challenge_stats_${this.weeklyChallengeLevel.id}`;
  }

  getCachedChallengeStatistics() {
    const cached = localStorage.getItem(this.getChallengeCacheKey());
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  saveChallengeStatistics(stats) {
    localStorage.setItem(this.getChallengeCacheKey(), JSON.stringify(stats));
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
      const cached = this.getCachedChallengeStatistics();
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
    const cachedStats = this.getCachedChallengeStatistics();
    if (cachedStats) {
      this.updateChallengeStatisticsDisplay(cachedStats);
    }

    // Fetch fresh statistics
    const stats = await this.fetchChallengeStatistics();
    if (stats) {
      this.saveChallengeStatistics(stats);
      this.updateChallengeStatisticsDisplay(stats);
    }
  }

  displayChallengeIcon() {
    const container = document.getElementById("challengeIconContainer");
    if (!container) {
      return;
    }

    let element = /** @type {HTMLElement} */ (container.querySelector(".level_icon"));
    const icon = createLevelIcon(this.weeklyChallengeLevel);
    const iconImg = /** @type {HTMLImageElement} */ (element.querySelector(".level_icon_image"));
    if (iconImg) {
      iconImg.src = icon.src;
      iconImg.style.width = "55px";
      iconImg.style.height = "55px";
    }

    /** @type {any} */ (element).level = this.weeklyChallengeLevel;
    element.onclick = () => {
      if (window.game?.openLevel) {
        window.game.openLevel(this.weeklyChallengeLevel, {
          levels: [this.weeklyChallengeLevel],
          source: "challenge",
        });
        screenManager.switchTo("game", false);
      }
    };

    this.updateChallengeStatistics();
  }
}

// Create global instance
export const gameLevelMenu = new GameLevelMenu();
