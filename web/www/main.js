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
