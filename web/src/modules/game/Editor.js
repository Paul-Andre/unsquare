"use strict";

import { GameBase } from './GameBase.js';
import { TileAnimationState } from '../core/TileAnimationState.js';
import { Grid } from '../core/Grid';
import { compute_operations_for_level, vector_sum, level_check_solution, get_level_compact_solution, vector_equal, vector_simplify_arithmetic, level_get_arithmetic, eric_partition_number } from '../core/algo.js';
import { save_editor_book } from '../core/bookUtils.js';
import { screenManager } from '../ui/ScreenManager.js';
import { Level, compute_gaussian_solution } from '../core/Level.js';
import { generate_id } from '../utils/helpers.js';


export class Editor extends GameBase {
  constructor(canvasId, divId) {
    super(canvasId, divId);
    this.referenceToOriginalLevel = null;
    this.drawMode = false;
    this.drawPaintValue = null; // The value to paint when dragging in draw mode
    this.drawUndoSaved = false; // Track if we've saved undo state for current draw operation
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

  // Hook to add additional state to undo
  getAdditionalState() {
    return {
      level: this.level.clone(),
    };
  }

  // Hook to restore additional state from undo
  restoreAdditionalState(undo) {
    if (undo.level) {
      this.level = undo.level;
      // Recompute operations when level changes
      this.operations = compute_operations_for_level(this.level);
      this.inverseOperations = new Map();
      for (let i = 0; i < this.operations.length; i++) {
        this.inverseOperations.set(this.operations[i].join(""), i);
      }
    }
  }

  // Save state before a move is applied
  preMove(move) {
    if (move != null && this.inverseOperations && this.level.solutions) {
      // When there was multiple running solutions, we only take the first one.
      // TODO: instead, we could apply to move to all of them, and take the ones for which it minimizes the number of moves.
      let runningSolution = this.level.solutions[0].slice();
      let vector = this.level.tileShape.moveToVector(this.tiles, move);
      let opIndex = this.inverseOperations.get(vector.join(""));
      if (opIndex !== undefined) {
        runningSolution[opIndex] += 1;
        vector_simplify_arithmetic(runningSolution, level_get_arithmetic(this.level));
        if (this.level) {
          this.level.solutions = [runningSolution]; // Don't need to slice
          this.level.solutionType = "running";
          this.level.par = null;
        }
      }
    }
  }

  postMove() {
  }

  syncTilesToLevel() {
    // Return early if no state is loaded yet
    if (!this.tiles || !this.level) {
      return;
    }

    // Note that this modifies the copy of level, not the reference to the original level
    // TODO: if here we're assigning by reference (as opposed to making a copy) and it works,
    // then why do we need this function at all? Investigate.
    this.level.tiles = this.tiles;
  }

  saveLevel() {
    this.syncTilesToLevel();
    this.referenceToOriginalLevel.copyFrom(this.level);
    save_editor_book(this.book);
  }

  undo() {
    super.undo();
    this.draw();
    // Start animation loop if animations were triggered
    this.startAnimationLoopIfNeeded();
  }

  submitSolution() {
    let sol_string = window.prompt("Solution in 01010101010 format");
    let sol = Array.from(sol_string).map(x => Number(x));

    this.syncTilesToLevel();
    let check = level_check_solution(this.level, sol);
    if (check) {
      // Save undo state
      this.saveUndoState(null);

      this.level.solutions = [sol.slice()];
      this.level.solutionType = "submitted";
      this.level.par = null;

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
      // Save undo state
      this.saveUndoState(null);

      this.level = level;
      this.tiles = level.tiles.clone();
      this.tileAnimationState = new TileAnimationState(this.tiles);
      this.operations = compute_operations_for_level(this.level);
      this.inverseOperations = new Map();
      for (let i = 0; i < this.operations.length; i++) {
        this.inverseOperations.set(this.operations[i].join(""), i);
      }
    } else {
      alert("Could not parse string");
    }
  }

  clear() {
    // Save undo state
    this.saveUndoState(null);

    // Animate the clear by setting transition state to 0 for all tiles
    this.tileAnimationState.forEach(function (tileState) {
      tileState.transitionState = 0;
    });

    this.tiles.forEachSet(function () {
      return 1;
    });
    let m = this.operations.length;
    this.level.solutions = [new Array(m).fill(0)];
    this.level.solutionType = "running";
    this.level.par = 0;
    this.updateGui();
    this.draw();
    // Start animation loop if animations were triggered
    this.startAnimationLoopIfNeeded();
  }

  play() {
    this.syncTilesToLevel();
    window.game.openLevel(this.level, this.book);
    screenManager.switchTo("game");
  }

  specificOnShow() {
    this.updateDrawModeButton();
    this.updateModeDropdown();
  }

  promptSize() {
    let promptedSize = window.prompt();
    if (promptedSize !== null) {
      // TODO make sure it doesn't break the Grid abstraction here.
      let size = Number(promptedSize);
      if (!isNaN(size)) {
        // Save undo state
        this.saveUndoState(null);

        let grid = Grid.empty(size, size);
        grid.setAll(1);

        // TODO: when expanding the grid, possibly copy the old tiles.
        this.level.tiles = grid;
        this.tiles = grid.clone();
        this.tileAnimationState = new TileAnimationState(this.tiles);

        let operations = compute_operations_for_level(this.level);
        let m = operations.length;
        this.operations = operations;
        this.inverseOperations = new Map();
        for (let i = 0; i < operations.length; i++) {
          this.inverseOperations.set(operations[i].join(""), i);
        }

        this.level.solutions = [new Array(m).fill(0)];
        this.level.solutionType = "running";
        this.level.par = 0;
      }
    }
  }

  saveAndReturn() {
    this.saveLevel();
    screenManager.goBack();
  }

  saveAs() {
    this.syncTilesToLevel();
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
    this.syncTilesToLevel();

    if (!this.tiles || !this.level) {
      return;
    }

    if (this.level.solutions && this.level.solutions.length > 0) {
      let sum = vector_sum(this.level.solutions[0]);
      let type = this.level.solutionType;
      let numSolutions = this.level.solutions.length;
      
      // Calculate minimum eric partition number across all solutions
      let minEric = Infinity;
      for (let solution of this.level.solutions) {
        let eric = eric_partition_number(this.level, solution);
        minEric = Math.min(minEric, eric);
      }
      
      let solutionsText = `(${numSolutions})`;
      this.div.getElementsByClassName("editorBest")[0].innerText =
        type +" "+sum + solutionsText + " " + minEric;
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
        if (e.key === "z" || e.key === "Z") {
          // Handle both "z" and "ctrl+z"/"meta+z" for undo
          e.preventDefault();
          this.undo();
        }
      }
    });
  }

  // Get valid tile coordinates from mouse position, or null if out of bounds
  getValidTileCoords(mouseX, mouseY) {
    const coords = this.level.tileShape.coordinatesFromMousePosition(
      mouseX,
      mouseY,
      this.tiles
    );

    if (
      coords.x >= 0 &&
      coords.x < this.tiles.width &&
      coords.y >= 0 &&
      coords.y < this.tiles.height
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
        // Save state for undo (only once per mouse down)
        if (!this.drawUndoSaved) {
          this.saveUndoState(null);
          this.drawUndoSaved = true;
        }

        // Toggle the clicked tile
        const currentValue = this.tiles.get(coords.x, coords.y);
        const newValue = this.level.colorScheme.resquare(currentValue);
        this.drawPaintValue = newValue;

        // Update both level and tiles
        this.tiles.set(coords.x, coords.y, newValue);
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
        const currentValue = this.tiles.get(coords.x, coords.y);
        if (currentValue !== this.drawPaintValue) {
          // Paint with the stored value
          this.tiles.set(coords.x, coords.y, this.drawPaintValue);
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
      if (this.tiles && this.level) {
        this.updateSolutionAfterDraw();
      }
      this.mouseStart.pressed = false;
      this.drawPaintValue = null;
      this.drawUndoSaved = false;
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

      // Update operations and inverse operations
      this.operations = operations;
      this.inverseOperations = new Map();
      for (let i = 0; i < operations.length; i++) {
        this.inverseOperations.set(operations[i].join(""), i);
      }

      // Update GUI
      this.updateGui();
    }, 0);
  }
}

export const editor = new Editor("editorCanvas", "editor");
