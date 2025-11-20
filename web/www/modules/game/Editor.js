"use strict";

import { GameBase } from './GameBase.js';
import { GameState } from '../core/GameState.js';
import { Grid } from '../core/Grid.js';
import { compute_operations_for_level, vector_sum, level_check_solution, get_level_compact_solution, vector_equal } from '../core/algo.js';
import { save_editor_book } from '../core/bookUtils.js';
import { screenManager } from '../ui/ScreenManager.js';
import { Level } from '../core/Level.js';

export class Editor extends GameBase {
  constructor(canvasId, divId) {
    super(canvasId, divId);
    this.referenceToOriginalLevel = null;
    this.undoList = [];

    // Override openLevel to handle editor-specific behavior
    this.openLevel = this.editorOpenLevel.bind(this);

    // Bind the action method to preserve 'this' context when passed as callback
    this.action = this.action.bind(this);
  }

  editorOpenLevel(level, book) {
    // We don't want the editor to open the actual level.
    // The reason I don't just put it in the base is that at some point the game might need to modify the level
    this.referenceToOriginalLevel = level;
    super.openLevel(level.clone(), book);
  }

  // this specifies what happens when you activate squares
  // (as in, do you UNsquare or you go the other way)
  action(v) {
    return this.level.colorScheme.resquare(v);
  }

  // Save state before a move is applied (for undo)
  preMove(move) {
    // Save current state for undo
    this.undoList.push({
      level: this.level.clone(),
      gameState: new GameState(this.level), // Create a fresh game state
    });
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
      this.numMoves -= 1;
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
      // Save current state for undo
      this.undoList.push({
        level: this.level.clone(),
        gameState: new GameState(this.level), // Create a fresh game state clone
      });

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
      // Save current state for undo
      this.undoList.push({
        level: this.level.clone(),
        gameState: new GameState(this.level), // Create a fresh game state clone
      });

      this.level = level;
      this.gameState = new GameState(this.level);
    } else {
      alert("Could not parse string");
    }
  }

  postApplyMove() {
    this.updateLevelInfo();
    if (
      this.level.solutionType == "reverse" ||
      this.level.solutionType == "confirmed"
    ) {
      this.level.solutionType = "reverse";
    } else {
      this.level.solutionType = "mixed";
    }
    if (vector_sum(this.level.solutionVector) <= 3) {
      this.level.solutionType = "confirmed";
    }
  }

  clear() {
    // Save current state for undo
    this.undoList.push({
      level: this.level.clone(),
      gameState: new GameState(this.level), // Create a fresh game state clone
    });

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
    game.openLevel(this.level, this.book);
    screenManager.switchTo("game");
  }

  specificOnShow() {
    if (
      !vector_equal(this.level.solutionVector, this.gameState.runningSolution)
    ) {
      this.gameState = new GameState(this.level);
    }
  }

  promptSize() {
    var size = window.prompt();
    if (size !== null) {
      // TODO make sure it doesn't break the Grid abstraction here.
      var size = new Number(size);
      if (!isNaN(size)) {
        // Save current state for undo
        this.undoList.push({
          level: this.level.clone(),
          gameState: new GameState(this.level), // Create a fresh game state clone
        });

        var grid = Grid.empty(size, size);

        grid.setAll(1);

        if (size >= this.gameState.tiles.width) {
          // this.gameState.tiles.forEach(function (v, x, y) {
          //   grid.set(x, y, v);
          // });
        } else {
        }
        this.level.tiles = grid;

        let operations = compute_operations_for_level(this.level);
        let m = operations.length;

        this.level.solutionVector = new Array(m).fill(0);
        this.level.solutionType = "confirmed";

        this.gameState = new GameState(this.level);
        //this.gameState.tiles = grid;
      }
    }
  }

  saveAndReturn() {
    this.saveLevel();
    screenManager.goBack();
  }

  setText(text) {
    this.level.text = text;
  }

  printFlat() {
    var ret = "";
    ret += this.gameState.tiles.width;
    ret += " ";
    ret += this.gameState.tiles.height;
    ret += "\n";
    var tiles = this.gameState.tiles;
    for (var j = 0; j < tiles.height; j++) {
      for (var i = 0; i < tiles.width; i++) {
        ret += "" + (tiles.get(i, j) - 1);
      }
      ret += "\n";
    }
    console.log(ret);
  }

  updateGui() {
    this.updateLevelInfo();

    // Return early if no game state is loaded yet
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
}

export const editor = new Editor("editorCanvas", "editor");
