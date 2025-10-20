// Main entry point for the application
import { Game } from './modules/game/Game.js';
import { Editor, editor } from './modules/game/Editor.js';
import { ScreenManager, screenManager } from './modules/ui/ScreenManager.js';
import { BookMenu, bookMenu } from './modules/ui/BookMenu.js';
import { GameLevelMenu, gameLevelMenu } from './modules/ui/GameLevelMenu.js';
import { LevelMenuComponent } from './modules/ui/LevelMenuComponent.js';
import { editorLevelMenu } from './modules/ui/editorLevelMenu.js';
import { calculateStates } from './modules/ui/LevelMenuComponent.js';
import { save_editor_book } from './modules/ui/BookMenu.js';
import { tileShapes } from './modules/core/tileShapes.js';
import { squareTileShape } from './modules/core/SquareTileShape.js';
import { trackLevelStart, trackLevelEnd } from './modules/utils/analytics.js';
import { vector_sum, vector_add, vector_simplify_arithmetic, level_get_arithmetic } from './modules/core/algo.js';
import Sortable from './modules/ui/Sortable.js';
import { parseCustomLevel } from './modules/utils/customParse.js';
import { displaySaveStr, importSave } from './modules/utils/exportSave.js';
import { Level } from './modules/core/Level.js';
import { MAX_WIDTH, IS_EDITOR } from './modules/utils/config.js';

// Global configuration
window.IS_EDITOR = IS_EDITOR;
window.MAX_WIDTH = MAX_WIDTH;

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

// Set up tileShapes
tileShapes.square = squareTileShape;

// Make functions globally available for backward compatibility
window.calculateStates = calculateStates;
window.save_editor_book = save_editor_book;
window.Sortable = Sortable;
window.trackLevelStart = trackLevelStart;
window.trackLevelEnd = trackLevelEnd;
window.vector_sum = vector_sum;
window.vector_add = vector_add;
window.vector_simplify_arithmetic = vector_simplify_arithmetic;
window.level_get_arithmetic = level_get_arithmetic;

// Make nextLevel and prevLevel globally available for HTML onclick handlers
window.nextLevel = function() {
  window.game.nextLevel();
};

window.prevLevel = function() {
  window.game.prevLevel();
};

// Make other functions globally available for HTML onclick handlers
window.displaySaveStr = displaySaveStr;
window.importSave = importSave;

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

// Set up screen manager additional functions
window.screenManager.additionalFunctions.game = window.game;

// Parse custom level if present in URL
parseCustomLevel(window.game);

console.log("Application initialized with modules");

// Onboarding flow (first-run instructions)
(function setupOnboarding() {
  const ONBOARDING_LS_KEY = 'unflip.onboarding.seen';
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

  window.onboardingNext = function() {
    if (currentSlideIndex === slides.length - 1) {
      try { localStorage.setItem(ONBOARDING_LS_KEY, '1'); } catch (e) {}
      // Switch to gameLevelMenu and then right after to game in order to have is
      // in the history stack.
      screenManager.switchTo('gameLevelMenu');
      let book = gameLevelMenu.levelMenu.book;
      window.game.openLevel(book.levels[0], book);
      screenManager.switchTo("game");

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

  // Show on first run only
  // let hasSeen = false;
  // try { hasSeen = !!localStorage.getItem(ONBOARDING_LS_KEY); } catch (e) {}
  // if (!hasSeen) {
  //   // Start on the onboarding screen
  //   screenManager.switchTo('opening_instructions');
  // }
})();
