"use strict";

class GameLevelMenu {
  constructor() {
    this.bookUrl = "data/2024_feb_17_better_intro_2.json";
    // this.bookUrl = "data/tiny_for_testing.json";
    
    // Delay the creation of level menu until after game is ready
    this.initializeLevelMenu();
    
    this.loadBook();
  }

  initializeLevelMenu() {
    // Wait for game to be available
    if (window.game) {
      this.levelMenu = new LevelMenuActivator("gameLevelMenu", false);
      screenManager.additionalFunctions.gameLevelMenu = this.levelMenu;
    } else {
      // Retry after a short delay
      setTimeout(() => this.initializeLevelMenu(), 100);
    }
  }

  // Best moves storage methods
  getLskForBestNumMoves(level) {
    return level.getFullIdentifier() + " bestNumMoves";
  }

  getBestNumMoves(level) {
    let sol = localStorage.getItem(this.getLskForBestNumMoves(level));
    if (sol === null) return null;
    return Number(sol);
  }

  setBestNumMoves(level, num) {
    localStorage.setItem(this.getLskForBestNumMoves(level), num);
  }

  clearBestNumMoves(level) {
    localStorage.removeItem(this.getLskForBestNumMoves(level));
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
        let resetUrlParam = (new URLSearchParams(location.search)).get("reset");
        if (resetUrlParam !== null) {
          this.levelMenu.clearAllBests();
        }
      }
    };

    request.onerror = (e) => {
      alert("Error loading levels");
    };

    request.send();
  }
}

// Create global instance
const gameLevelMenuInstance = new GameLevelMenu();



