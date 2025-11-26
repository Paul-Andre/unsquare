"use strict";

import { GameBase } from './GameBase.js';
import { GameState } from '../core/GameState.js';
import { Grid } from '../core/Grid.js';
import { compute_operations_for_level, vector_sum, level_check_solution, get_level_compact_solution, vector_equal } from '../core/algo.js';
import { save_editor_book } from '../core/bookUtils.js';
import { screenManager } from '../ui/ScreenManager.js';
import { Level, compute_gaussian_solution } from '../core/Level.js';
import { generate_id } from '../utils/helpers.js';


export class Editor extends GameBase {
  constructor(canvasId, divId) {
    super(canvasId, divId);
    this.referenceToOriginalLevel = null;
    this.undoList = [];
    this.drawMode = false;
    this.drawPaintValue = null; // The value to paint when dragging in draw mode
    this.pendingSolvabilityCheck = null; // Timeout ID for deferred solvability checking

    // Override openLevel to handle editor-specific behavior
    this.openLevel = this.editorOpenLevel.bind(this);

    // Bind the action method to preserve 'this' context when passed as callback
    this.action = this.action.bind(this);

    // Set up keyboard event listeners
    this.setupKeyboardListeners();
  }

  editorOpenLevel(level, book) {
    // We don't want the editor to open the actual level.
    // The reason I don't just put it in the base is that at some point the game might need to modify the level
    this.referenceToOriginalLevel = level;
    super.openLevel(level.clone(), book);
    this.updateDrawModeButton();
    this.updateModeDropdown();
  }

  // this specifies what happens when you activate squares
  // (as in, do you UNsquare or you go the other way)
  action(v) {
    return this.level.colorScheme.resquare(v);
  }

  // Save current state for undo
  saveUndoState() {
    this.undoList.push({
      level: this.level.clone(),
      gameState: new GameState(this.level),
    });
  }

  preMove(move) {
    this.saveUndoState();
  }

  updateLevelInfo() {
    // Return early if no game state is loaded yet
    if (!this.gameState || !this.level) {
      return;
    }

    // Note that this modifies the copy of level, not the reference to the original level
    this.level.tiles = this.gameState.tiles;
    this.level.solutionVector = this.gameState.runningSolution;
    // TODO: ???
    this.level.par = null;
  }

  saveLevel() {
    this.updateLevelInfo();
    this.referenceToOriginalLevel.copyFrom(this.level);
    save_editor_book(this.book);
  }

  undo() {
    if (this.undoList.length > 0) {
      const undo = this.undoList.pop();
      this.level = undo.level;
      this.gameState = undo.gameState;
      this.draw();
      // Start animation loop if animations were triggered
      this.startAnimationLoopIfNeeded();
    }
  }

  submitSolution() {
    let sol_string = window.prompt("Solution in 01010101010 format");
    let sol = Array.from(sol_string).map(x => Number(x));

    this.updateLevelInfo();
    let check = level_check_solution(this.level, sol);
    if (check) {
      this.saveUndoState();

      this.level.solutionVector = sol;
      this.level.solutionType = "submitted";

      // Create new game state
      this.gameState = new GameState(this.level);
    } else {
      alert("Solution not satisfactory");
    }
  }

  submitCompact() {
    let string = window.prompt(
      "String representing the level (as found in the link's custom param"
    );
    let level = Level.fromCompact(string);
    if (level) {
      this.saveUndoState();

      this.level = level;
      this.gameState = new GameState(this.level);
    } else {
      alert("Could not parse string");
    }
  }

  clear() {
    this.saveUndoState();

    // Animate the clear by setting transition state to 0 for all tiles
    this.gameState.tileStates.forEach(function (tileState) {
      tileState.transitionState = 0;
    });

    this.gameState.tiles.forEachSet(function () {
      return 1;
    });
    let m = this.gameState.operations.length;
    this.gameState.runningSolution = new Array(m).fill(0);
    this.updateGui();
    this.draw();
    // Start animation loop if animations were triggered
    this.startAnimationLoopIfNeeded();
  }

  play() {
    this.updateLevelInfo();
    window.game.openLevel(this.level, this.book);
    screenManager.switchTo("game");
  }

  specificOnShow() {
    if (
      !vector_equal(this.level.solutionVector, this.gameState.runningSolution)
    ) {
      this.gameState = new GameState(this.level);
    }
    this.updateDrawModeButton();
    this.updateModeDropdown();
  }

  promptSize() {
    let promptedSize = window.prompt();
    if (promptedSize !== null) {
      // TODO make sure it doesn't break the Grid abstraction here.
      let size = Number(promptedSize);
      if (!isNaN(size)) {
        this.saveUndoState();

        let grid = Grid.empty(size, size);
        grid.setAll(1);

        // TODO: when expanding the grid, possibly copy the old tiles.
        this.level.tiles = grid;

        let operations = compute_operations_for_level(this.level);
        let m = operations.length;

        this.level.solutionVector = new Array(m).fill(0);
        this.level.solutionType = "confirmed";

        this.gameState = new GameState(this.level);
      }
    }
  }

  saveAndReturn() {
    this.saveLevel();
    screenManager.goBack();
  }

  saveAs() {
    this.updateLevelInfo();
    const newLevel = this.level.clone();
    newLevel.id = generate_id("level");
    newLevel.index = this.book.levels.length;
    this.book.levels.push(newLevel);
    save_editor_book(this.book);
    this.editorOpenLevel(newLevel, this.book);
  }

  setText(text) {
    this.level.text = text;
  }

  setMode(mode) {
    this.level.mode = mode;
  }

  updateGui() {
    this.updateLevelInfo();

    if (!this.gameState || !this.level) {
      return;
    }

    if (this.gameState.runningSolution) {
      let sum = vector_sum(this.level.solutionVector);
      let type = this.level.solutionType;
      this.div.getElementsByClassName("editorBest")[0].innerText =
        sum + " " + type;
    } else {
      let type = this.level.solutionType || "unknown";
      this.div.getElementsByClassName("editorBest")[0].innerText = "? " + type;
    }
  }

  // TODO: hardcode the url?
  getCustomUrl() {
    let base = location.origin + location.pathname;
    let encoding = get_level_compact_solution(this.level);
    return base + "?custom=" + encoding;
  }

  displayShare() {
    let sol_string = window.prompt("URL for sharing", this.getCustomUrl());
  }

  toggleDrawMode() {
    this.drawMode = !this.drawMode;
    this.updateDrawModeButton();
  }

  updateDrawModeButton() {
    const button = document.getElementById("drawModeButton");
    if (button) {
      button.textContent = this.drawMode ? "Draw Mode: ON" : "Draw Mode: OFF";
      if (this.drawMode) {
        button.classList.add("drawModeActive");
      } else {
        button.classList.remove("drawModeActive");
      }
    }
  }

  updateModeDropdown() {
    const select = document.getElementById("levelModeSelect");
    if (select) {
      select.value = this.level.mode || "normal";
    }
  }

  setupKeyboardListeners() {
    // TODO: note that the event listener never gets removed
    // It is okay for the time being since I only initialize this "component" once,
    // but will need to figure out a better way to do once I do differently.
    window.addEventListener("keydown", (e) => {
      // Only handle if editor screen is active and not typing in an input
      if (
        screenManager.currentScreenName === "editor" &&
        e.target.tagName !== "INPUT" &&
        e.target.tagName !== "TEXTAREA"
      ) {
        if (e.key === "d" || e.key === "D") {
          e.preventDefault();
          this.toggleDrawMode();
        }
      }
    });
  }

  // Get valid tile coordinates from mouse position, or null if out of bounds
  getValidTileCoords(mouseX, mouseY) {
    const coords = this.level.tileShape.coordinatesFromMousePosition(
      mouseX,
      mouseY,
      this.gameState.tiles
    );

    if (
      coords.x >= 0 &&
      coords.x < this.gameState.tiles.width &&
      coords.y >= 0 &&
      coords.y < this.gameState.tiles.height
    ) {
      return coords;
    }
    return null;
  }

  // Override mouse handlers for draw mode
  doMouseDown(x, y) {
    if (this.drawMode) {
      this.mouseStart.x = x / this.canvasSize;
      this.mouseStart.y = y / this.canvasSize;
      this.mouseStart.pressed = true;

      const coords = this.getValidTileCoords(
        this.mouseStart.x,
        this.mouseStart.y
      );

      if (coords) {
        this.saveUndoState();

        // Toggle the clicked tile
        const currentValue = this.gameState.tiles.get(coords.x, coords.y);
        const newValue = this.level.colorScheme.resquare(currentValue);
        this.drawPaintValue = newValue;

        // Update both level and gameState tiles
        this.gameState.tiles.set(coords.x, coords.y, newValue);
        this.level.tiles.set(coords.x, coords.y, newValue);

        // Update solution and redraw
        this.updateSolutionAfterDraw();
        this.draw();
      }
      return;
    }

    // Normal mode - call parent implementation
    super.doMouseDown(x, y);
  }

  doMouseMove(x, y) {
    if (this.drawMode && this.mouseStart.pressed && this.drawPaintValue !== null) {
      const coords = this.getValidTileCoords(
        x / this.canvasSize,
        y / this.canvasSize
      );

      if (coords) {
        // Only paint if the tile value is different (avoid redundant updates)
        const currentValue = this.gameState.tiles.get(coords.x, coords.y);
        if (currentValue !== this.drawPaintValue) {
          // Paint with the stored value
          this.gameState.tiles.set(coords.x, coords.y, this.drawPaintValue);
          this.level.tiles.set(coords.x, coords.y, this.drawPaintValue);

          // Update solution and redraw
          this.updateSolutionAfterDraw();
          this.draw();
        }
      }
      return;
    }

    // Normal mode - call parent implementation
    super.doMouseMove(x, y);
  }

  doMouseUp(x, y) {
    if (this.drawMode) {
      // Final solvability check on mouse up (in case we missed any during drag)
      if (this.gameState && this.level) {
        this.updateSolutionAfterDraw();
      }
      this.mouseStart.pressed = false;
      this.drawPaintValue = null;
      return;
    }

    // Normal mode - call parent implementation
    super.doMouseUp(x, y);
  }

  updateSolutionAfterDraw() {
    // Clear any pending solvability check
    if (this.pendingSolvabilityCheck !== null) {
      clearTimeout(this.pendingSolvabilityCheck);
      this.pendingSolvabilityCheck = null;
    }

    // Defer solvability checking to the next frame using setTimeout zero trick
    this.pendingSolvabilityCheck = setTimeout(() => {
      this.pendingSolvabilityCheck = null;

      // Recompute operations and solution
      const operations = compute_operations_for_level(this.level);
      const m = operations.length;

      // Check solvability using gaussian elimination
      compute_gaussian_solution(this.level);

      // Update gameState operations and inverse operations
      this.gameState.operations = operations;
      this.gameState.inverseOperations = new Map();
      for (let i = 0; i < operations.length; i++) {
        this.gameState.inverseOperations.set(operations[i].join(""), i);
      }

      // Update running solution
      this.gameState.runningSolution = this.level.solutionVector
        ? this.level.solutionVector.slice()
        : new Array(m).fill(0);

      // Update GUI
      this.updateGui();
    }, 0);
  }
}

export const editor = new Editor("editorCanvas", "editor");
