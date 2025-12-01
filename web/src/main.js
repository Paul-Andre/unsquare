// Main entry point for the application
import { Game } from './modules/game/Game.js';
import { editor } from './modules/game/Editor.js';
import { screenManager } from './modules/ui/ScreenManager.js';
import { bookMenu } from './modules/ui/BookMenu.js';
import { gameLevelMenu } from './modules/ui/GameLevelMenu.js';
import { editorLevelMenu } from './modules/ui/editorLevelMenu.js';
import { checkAndOpenCustomLevel } from './modules/utils/customParse.js';
import { Level } from './modules/core/Level.js';
import * as config from './modules/utils/config.js';
import * as algo from './modules/core/algo.js';
import { generate_id } from './modules/utils/helpers.js';

// Global configuration
window.config = config;

// Initialize global instances
window.game = new Game("gameCanvas", "game");
window.editor = editor;
window.screenManager = screenManager;
window.bookMenu = bookMenu;
window.gameLevelMenu = gameLevelMenu;
window.editorLevelMenu = editorLevelMenu;
window.parseCustomLevel = checkAndOpenCustomLevel;

window.algo = algo;

// Set up screen manager additional functions
window.screenManager.additionalFunctions.editorLevelMenu = editorLevelMenu;
window.screenManager.additionalFunctions.bookMenu = bookMenu;
window.screenManager.additionalFunctions.editor = editor;
window.screenManager.additionalFunctions.game = window.game;

// Make nextLevel and prevLevel globally available for HTML onclick handlers
window.nextLevel = function() {
  window.game.nextLevel();
};

window.prevLevel = function() {
  window.game.prevLevel();
};

window.openEditor = function() {
  window.screenManager.switchTo("bookMenu");
};

window.openPlayerEditor = function() {
  let level = Level.empty(6);
  level.index = 0;
  window.editor.openLevel(level, {
    levels: [level],
    source: "playerEditor",
  });
  window.screenManager.switchTo("editor");
};

// Parse custom level if present in URL
let openedCustom = checkAndOpenCustomLevel(window.game);

// Remove utm parameters from the url
window.addEventListener('load',
  function () {
    setTimeout(function () {
      const url = new URL(window.location.href);
      url.searchParams.forEach((value, key) => {
        if (key.startsWith('utm_')) {
          url.searchParams.delete(key);
        }
      });
      window.history.replaceState({}, '', url.toString());
    }, 5000);
  });


// Onboarding flow (first-run instructions)
(function setupOnboarding() {
  const slidesContainer = document.getElementById('onboardingSlides');
  const openingSection = document.getElementById('opening_instructions');
  const prevBtn = document.getElementById('onboardingPrevBtn');
  const nextBtn = document.getElementById('onboardingNextBtn');

  let currentSlideIndex = 0;
  const slides = Array.from(slidesContainer.children);

  function showSlide(idx) {
    currentSlideIndex = Math.max(0, Math.min(idx, slides.length - 1));
    for (let i = 0; i < slides.length; i++) {
      slides[i].classList.toggle('variant_shown', i === currentSlideIndex);
    }
    prevBtn.disabled = currentSlideIndex === 0;
    if (currentSlideIndex === slides.length - 1) {
      nextBtn.textContent = 'Play';
    } else {
      nextBtn.textContent = 'Next >';
    }
  }

  window.onboardingPrev = function() {
    showSlide(currentSlideIndex - 1);
  };

  let has_already_went_to_first_level = false;

  window.onboardingNext = function() {
    if (currentSlideIndex === slides.length - 1) {
      if (has_already_went_to_first_level) {
        screenManager.switchTo('gameLevelMenu');
      } else {
        // Switch to gameLevelMenu and then right after to game in order to have is
        // in the history stack.
        screenManager.switchTo('gameLevelMenu');

        let book = gameLevelMenu.levelMenu.book;
        window.game.openLevel(book.levels[0], book);
        screenManager.switchTo("game");
        has_already_went_to_first_level = true;
      }

      return;
    }
    showSlide(currentSlideIndex + 1);
  };


  // Register screen lifecycle to reset slides when shown
  screenManager.additionalFunctions.opening_instructions = {
    onShow: function() {
      showSlide(0);
    }
  };

  showSlide(0);

  let num_levels_done = 0;
  for (let key in localStorage) {
    if (key.startsWith("level_") && key.endsWith("bestNumMoves")) {
      num_levels_done += 1;
    }
  }

  let had_experience = num_levels_done >= 5;

  if (openedCustom) {
    // pass; It was already opened by the checkAndOpenCustomLevel function.
  } else if (had_experience) {
    has_already_went_to_first_level = true;
    screenManager.switchTo('gameLevelMenu');
  } else {
    screenManager.switchTo('opening_instructions');
  }
})();

if (localStorage.getItem("player_id") === null) {
  let player_id = generate_id("anon");
  localStorage.setItem("player_id", player_id);
}

// 10-click to get into editor mode.
(function setupTitleEasterEgg() {
  const titleElement = document.getElementById("homeTitle");
  if (!titleElement) return;

  let clickCount = 0;
  let resetTimeout = null;
  const REQUIRED_CLICKS = 10;
  const RESET_DELAY = 2000; // 2 seconds

  function resetCounter() {
    clickCount = 0;
    if (resetTimeout) {
      clearTimeout(resetTimeout);
      resetTimeout = null;
    }
  }

  function handleClick() {
    clickCount++;
    
    // Clear existing timeout
    if (resetTimeout) {
      clearTimeout(resetTimeout);
    }
    
    // Set new timeout to reset counter
    resetTimeout = setTimeout(resetCounter, RESET_DELAY);
    
    // Check if we've reached the required number of clicks
    if (clickCount >= REQUIRED_CLICKS) {
      resetCounter();
      window.openEditor();
    }
  }

  // Support both click and touch events
  titleElement.addEventListener("click", handleClick);
  titleElement.addEventListener("touchend", function(e) {
    e.preventDefault();
    handleClick();
  });

  // Reset counter when home screen is hidden
  screenManager.additionalFunctions.home = {
    onHide: resetCounter
  };
})();
