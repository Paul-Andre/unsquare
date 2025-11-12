"use strict";

import { GameBase } from './GameBase.js';
import { calculateStates } from '../ui/LevelMenuComponent.js';
import { vector_sum, vector_add, vector_simplify_arithmetic, level_get_arithmetic } from '../core/algo.js';
import { save_editor_book } from '../core/bookUtils.js';
import { trackLevelEnd } from '../utils/analytics.js';
import { getBestNumMoves, setBestNumMoves, clearBestNumMoves } from '../core/levelUtils.js';

export class Game extends GameBase {
  constructor(canvasId, divId) {
    super(canvasId, divId);
    // Bind the action method to preserve 'this' context when passed as callback
    this.action = this.action.bind(this);


    this.numSolvedThisSession = 0;
    this.showedDiscordOverlay = false;
  }

  // this specifies what happens when you activate squares
  action(v) {
    return this.level.colorScheme.unsquare(v);
  }

  // Game-specific logic for mouse down
  onMouseDown() {
    // Hide the finished level element
    const a = this.div.getElementsByClassName("finishedLevel")[0];
    if (a) {
      a.style.display = "none";
    }
  }

  // Game-specific logic after a move
  postMove() {
    if (this.isFinished()) {
      this.finishedLevel();
    }
  }

  restart() {
    // Save current state for undo before restarting
    // TODO: this is a bit of a hack, but it works for now.
    let savedUndoList = null;
    if (this.gameState && this.gameState.numMoves > 0) {
      savedUndoList = [...this.gameState.undoList];
      savedUndoList.push({
        tiles: this.gameState.tiles.clone(),
        move: "restart",
        runningSolution: this.gameState.runningSolution.slice(),
        numMoves: this.gameState.numMoves,
        isRestart: true,
      });
    }

    this.openLevel(this.level, this.book);

    // Restore the undo list after creating new game state
    if (savedUndoList) {
      this.gameState.undoList = savedUndoList;
    }

    this.draw();
    // Force an immediate redraw to ensure canvas updates
    this.forceRedraw();
  }

  isFinished() {
    if (this.gameState) {
      var finished = true;
      this.gameState.tiles.forEach(function (v) {
        if (v != 1) {
          finished = false;
        }
      });
      return finished;
    }
    return false;
  }

  finishedLevel() {
    let oldSum = vector_sum(this.level.solutionVector);

    console.log(this.gameState.runningSolution);

    //TODO (not sure if it's an add or a subtract) (but it's the same thing mod 2)
    let newSolution = vector_add(
      this.level.solutionVector,
      this.gameState.runningSolution
    );
    vector_simplify_arithmetic(newSolution, level_get_arithmetic(this.level));
    let newSum = vector_sum(newSolution);

    // TODO: this is some somewhat fragile code that tries to integrate with the editor...
    if (newSum < oldSum) {
      this.level.solutionVector = newSolution;
      this.level.solutionType = "manual";
      save_editor_book(this.book);
    }

    let prevBest = getBestNumMoves(this.level);

    let numMoves = this.gameState.numMoves;

    if (prevBest === null || numMoves < prevBest) {
      setBestNumMoves(this.level, numMoves);
    }

    // TODO: make sure this isn't sent excessively for some reason.
    trackLevelEnd(this.level, this.book);

    this.numSolvedThisSession += 1;

    this.displayLevelGui(this.level);
    this.updateGui();
  }

  getCurrentBest() {
    if (this.level) {
      return getBestNumMoves(this.level);
    }
    return null;
  }

  displayLevelGui(level) {
    // TODO: really ugly hack
    {
      var a = this.div.getElementsByClassName("finishedLevel")[0];
      a.style.display = "none";
    }
    {
      var a = this.div.getElementsByClassName("finishedGame")[0];
      a.style.display = "none";
    }

    document.getElementById("TextShower").innerText = level.text;
    let par = vector_sum(level.solutionVector);
    //if (level.solutionType == "gaussian" || level.solutionType == "mixed")

    if (level.custom) {
      this.div.getElementsByClassName("parContentInclusive")[0].innerText =
        "creator par: " + par;
    } else {
      this.div.getElementsByClassName("parContentInclusive")[0].innerText =
        "par: " + par;
    }

    let index = level.index;

    if (level.custom) {
      document.getElementById("LevelIndicator").innerText = "Custom Level";
    } else {
      document.getElementById("LevelIndicator").innerText =
        "Level " + (1 + index);
    }

    let states = calculateStates(this.book);

    {
      let prevButton = this.div.querySelector("#prevButton");
      let prevIndex = index - 1;
      if (prevIndex < 0 || states[prevIndex] < 2) {
        prevButton.setAttribute("disabled", "disabled");
      } else {
        prevButton.removeAttribute("disabled");
      }
    }

    {
      let nextButton = this.div.querySelector("#nextButton");
      let nextIndex = index + 1;
      if (nextIndex >= states.length || states[nextIndex] < 2) {
        nextButton.setAttribute("disabled", "disabled");
      } else {
        nextButton.removeAttribute("disabled");
      }
    }
  }

  undo() {
    this.gameState.undo();
    this.draw();
    // Start animation loop if animations were triggered
    this.startAnimationLoopIfNeeded();
  }

  checkShowOverlay() {
    // TODO: when multiple books, rethink this.
    let levels = this.book.levels;
    let totSolved = 0;
    for (let i = 0; i<levels.length; i++) {
      let level = levels[i];
      if (getBestNumMoves(level)) {
        totSolved += 1;
      }
    }

    // Todo: make this be a parameter on posthog
    if (totSolved >= 35 && this.numSolvedThisSession >=10 && !this.showedDiscordOverlay) {
      return true;
    }
    return false;
  }

  nextLevel() {
    let level = this.level;
    let index = level.index;
    let levels = this.book.levels;

    if (this.checkShowOverlay()) {
      // TODO: cache this once when the object is created?
      let el = document.getElementById("discord_overlay_message");
      el.hidden = false;
      this.showedDiscordOverlay = true;
    } else {
      let el = document.getElementById("discord_overlay_message");
      el.hidden = true;

      if (index + 1 < levels.length) {
        index += 1;
        var nextLevel = levels[index];

        this.openLevel(nextLevel, this.book);
        this.onShow();
        // Force redraw to ensure canvas updates
        this.forceRedraw();
      }
    }
  }

  prevLevel() {
    let level = this.level;
    let index = level.index;
    let levels = this.book.levels;

    if (index - 1 >= 0) {
      index -= 1;
      var nextLevel = levels[index];

      this.openLevel(nextLevel, this.book);
      this.onShow();
      // Force redraw to ensure canvas updates
      this.forceRedraw();
    }
  }
}
