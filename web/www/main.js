// Main entry point for the application
import { Game } from './modules/game/Game.js';
import { editor } from './modules/game/Editor.js';
import { screenManager } from './modules/ui/ScreenManager.js';
import { bookMenu } from './modules/ui/BookMenu.js';
import { gameLevelMenu } from './modules/ui/GameLevelMenu.js';
import { editorLevelMenu } from './modules/ui/editorLevelMenu.js';
import { parseCustomLevel } from './modules/utils/customParse.js';
import * as config from './modules/utils/config.js';

// Global configuration
window.config = config;

// Initialize global instances
window.game = new Game("gameCanvas", "game");
window.editor = editor;
window.screenManager = screenManager;
window.bookMenu = bookMenu;
window.gameLevelMenu = gameLevelMenu;
window.editorLevelMenu = editorLevelMenu;

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
parseCustomLevel(window.game);

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
  for (var key in localStorage) {
    if (key.startsWith("level_") && key.endsWith("bestNumMoves")) {
      num_levels_done += 1;
    }
  }

  let skip_instructions = num_levels_done >= 5;

  if (!skip_instructions) {
    // Start on the onboarding screen
    screenManager.switchTo('opening_instructions');
  } else {
    has_already_went_to_first_level = true;
    screenManager.switchTo('gameLevelMenu');
  }
})();
