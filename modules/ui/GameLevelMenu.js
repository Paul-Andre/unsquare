"use strict";

import { LevelMenuComponent } from './LevelMenuComponent.js';
import { screenManager } from './ScreenManager.js';
import { book_reviver } from '../core/bookUtils.js';
import { Level } from '../core/Level.js';
import { createLevelIcon } from './icon.js';
import { htmlStringToElement } from '../utils/helpers.js';

export class GameLevelMenu {
  constructor() {
    this.bookUrl = "data/2025_nov_11_reordered_solved_fixed.json";
    // this.bookUrl = "data/tiny_for_testing.json";

    // Delay the creation of level menu until after game is ready
    this.initializeLevelMenu();

    this.loadBook();
  }

  initializeLevelMenu() {
    // Wait for game to be available
    if (window.game) {
      this.levelMenu = new LevelMenuComponent("gameLevelMenu", false);
      screenManager.additionalFunctions.gameLevelMenu = this.levelMenu;
    } else {
      // Retry after a short delay
      setTimeout(() => this.initializeLevelMenu(), 100);
    }
  }


  loadBook() {
    // https://stackoverflow.com/a/35294675
    let request = new XMLHttpRequest();
    request.open("GET", this.bookUrl, true);

    request.onload = () => {
      if (request.status >= 200 && request.status < 400) {
        let data = JSON.parse(request.responseText, book_reviver);
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
      }
    };

    request.onerror = e => {
      alert("Error loading levels");
    };

    request.send();
  }

  displayChallengeIcon() {
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

    const challengeLevel = Level.fromJsonObject(challengeLevelJson);
    const container = document.getElementById("challengeIconContainer");


    if (!container) {
      return;
    }

    container.innerHTML = "";

    let element = htmlStringToElement(`<div class="level_icon">
    <img class="level_icon_image"> </img>
    <div class="level_icon_par"> </div>
    </div>
    `);

    const icon = createLevelIcon(challengeLevel);
    const iconImg = element.querySelector(".level_icon_image");
    iconImg.src = icon.src;
    iconImg.style.width = "55px";
    iconImg.style.height = "55px";

    element.level = challengeLevel;
    element.onclick = () => {
      if (window.game && window.game.openLevel) {
        window.game.openLevel(challengeLevel, {
          levels: [challengeLevel],
          source: "challenge",
        });
        screenManager.switchTo("game");
      }
    };

    container.appendChild(element);
  }
}

// Create global instance
export const gameLevelMenu = new GameLevelMenu();
