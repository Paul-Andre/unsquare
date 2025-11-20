"use strict";

import { GameBase } from './GameBase.js';
import { calculateStates } from '../ui/LevelMenuComponent.js';
import { vector_sum, vector_add, vector_simplify_arithmetic, level_get_arithmetic } from '../core/algo.js';
import { save_editor_book } from '../core/bookUtils.js';
import { trackLevelEnd } from '../utils/analytics.js';
import { getBestNumMoves, setBestNumMoves, clearBestNumMoves } from '../core/levelUtils.js';
import * as config from '../utils/config.js';

export class Game extends GameBase {
  constructor(canvasId, divId) {
    super(canvasId, divId);
    // Bind the action method to preserve 'this' context when passed as callback
    this.action = this.action.bind(this);


    this.numSolvedThisSession = 0;
    this.showedDiscordOverlay = false;

    // Tutorial hint system properties
    this.demoDrag = null;
    this.demoDragTime = 0;
    this.firstDemoDrag = {
      start: { x: 0.33, y: 0.33 },
      end: { x: 0.67, y: 0.67 },
    };
  }

  // this specifies what happens when you activate squares
  action(v) {
    return this.level.colorScheme.unsquare(v);
  }

  // Game-specific logic for mouse down
  onMouseDown() {
    // Hide the finished level elements
    const a = this.div.getElementsByClassName("finishedLevel")[0];
    if (a) {
      a.style.display = "none";
      a.classList.remove("showing");
    }
    const b = this.div.getElementsByClassName("finishedLevelPerfect")[0];
    if (b) {
      b.style.display = "none";
      b.classList.remove("showing");
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

  isInBasicBook() {
    // TODO: add some kind of flag to the book object for this.
    return this.book.source.endsWith(".json");
  }

  updateGui() {
    // Return early if no level is loaded yet
    if (!this.level || !this.gameState) {
      return;
    }

    if (config.ONBOARDING_HINTS) {
      if (
        this.level.id == "level_1693531796434" &&
        this.gameState.numMoves == 0
      ) {
        this.demoDrag = this.firstDemoDrag;
      } else {
        this.demoDrag = null;
      }
      // The logic would be something like:
      // Check if needs to provide hint according to level json
      // Run a basic hint system to get the next move to be hinted, or otherwise to undo
      // If a move to be hinted, calculate the drag based on that move, and set it as this.demoDrag

      let suggestsRestart = false;
      if (
        this.level.id == "level_1693531796434" &&
        this.gameState.numMoves >= 1 &&
        !this.isFinished()
      ) {
        suggestsRestart = true;
      }
      if (
        this.isInBasicBook() &&
        this.level.index < 10 &&
        this.gameState.numMoves > this.level.par * 3 &&
        !this.isFinished()
      ) {
        suggestsRestart = true;
      }

      let restartButton = this.div.getElementsByClassName("restart_button")[0];
      if (suggestsRestart) {
        restartButton.classList.add("in_yo_face");
      } else {
        restartButton.classList.remove("in_yo_face");
      }
    }
    if (this.isFinished()) {
      if (this.isInBasicBook()) {
        if (this.level.index >= this.book.levels.length - 1) {
          // TODO: won game.
          const a = this.div.getElementsByClassName("finishedGame")[0];
          a.style.display = "block";
        } else {
          let a;
          if (this.gameState.numMoves <= this.level.par) {
            a = this.div.getElementsByClassName("finishedLevelPerfect")[0];
            if (config.PERFECT_SCREEN_GOLDEN_GLOW) {
              a.classList.add("withGoldenGlow");
            } else {
              a.classList.remove("withGoldenGlow");
            }
          } else {
            a = this.div.getElementsByClassName("finishedLevel")[0];
          }
          a.style.display = "block";
          // Update moves display
          const movesDisplay = a.querySelector(".finishedLevelMoves");
          if (movesDisplay) {
            movesDisplay.innerText = `${this.gameState.numMoves}/${this.level.par} moves`;
          }
          // Trigger fade-in animation after element is rendered
          requestAnimationFrame(() => {
            a.classList.add("showing");
          });
        }
      }
    } else {
      {
        let a = this.div.getElementsByClassName("finishedLevel")[0];
        a.style.display = "none";
        a.classList.remove("showing");
      }
      {
        let a = this.div.getElementsByClassName("finishedLevelPerfect")[0];
        a.style.display = "none";
        a.classList.remove("showing");
      }
      {
        let a = this.div.getElementsByClassName("finishedGame")[0];
        a.style.display = "none";
      }
    }

    if (this.gameState) {
      const a = this.div.getElementsByClassName("movesContent")[0];
      a.innerText = this.gameState.numMoves;
    }

    const a = this.div.getElementsByClassName("bestContent")[0];
    const b = this.getCurrentBest();

    if (b === null || b === undefined) {
      a.innerText = "-";
    } else {
      a.innerText = b;
    }
  }

  displayLevelGui(level) {
    // TODO: really ugly hack
    {
      var a = this.div.getElementsByClassName("finishedLevel")[0];
      a.style.display = "none";
      a.classList.remove("showing");
    }
    {
      var a = this.div.getElementsByClassName("finishedLevelPerfect")[0];
      a.style.display = "none";
      a.classList.remove("showing");
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

  // Animation utility methods
  interpolate(a, b, t) {
    return a + (b - a) * t;
  }

  // [0,1] -> [0,1]
  // https://stackoverflow.com/a/25730573/2356347
  bezierBlend(t) {
    return t * t * (3.0 - 2.0 * t);
  }

  clamp(x) {
    return Math.min(1, Math.max(0, x));
  }

  easeOut(x) {
    return this.interpolate(this.interpolate(x, 1, x), 1, x);
  }

  dragBlend(x) {
    return this.interpolate(
      this.interpolate(this.interpolate(this.bezierBlend(x), 1, x), 1, x),
      1,
      x
    );
  }

  // Tutorial hint overlay drawing
  overlayDemoDrag() {
    if (!this.demoDrag) {
      return;
    }
    let width = this.canvas.width;
    let height = this.canvas.height;

    // TODO: maybe include this in the demoDrag object?
    let relativeDragSize = 40 / config.MAX_WIDTH;
    let relativeLineSize = relativeDragSize * 0.75;

    // TODO: figure out whether to use width or height. Only issue when rectangles
    this.ctx.lineWidth = relativeLineSize * width;
    this.ctx.lineCap = "round";
    this.ctx.strokeStyle = "#4fb6ff55";
    this.ctx.beginPath();
    this.ctx.moveTo(
      this.demoDrag.start.x * width,
      this.demoDrag.start.y * height
    );
    this.ctx.lineTo(this.demoDrag.end.x * width, this.demoDrag.end.y * height);
    this.ctx.stroke();

    // TODO: the ease-out should actually be related to the size of the grid ideally
    let animTime = this.demoDragTime;
    let easedTime = this.dragBlend(animTime);
    let bubbleX =
      this.interpolate(this.demoDrag.start.x, this.demoDrag.end.x, easedTime) *
      width;
    let bubbleY =
      this.interpolate(this.demoDrag.start.y, this.demoDrag.end.y, easedTime) *
      height;

    let bubbleSize = relativeDragSize * width;
    this.ctx.fillStyle = "#4fb6ff55";
    this.ctx.beginPath();
    this.ctx.arc(bubbleX, bubbleY, bubbleSize, 0, 2 * Math.PI);
    this.ctx.fill();
  }

  // Hook methods for animation and drawing
  hasAdditionalAnimations() {
    return this.demoDrag !== null;
  }

  updateAdditionalAnimations(timestamp) {
    if (this.demoDrag) {
      this.demoDragTime +=
        (timestamp - this.gameState.lastUpdateTimestamp) / 1500;
      this.demoDragTime %= 1;
      return true;
    }
    return false;
  }

  drawOverlays() {
    if (this.demoDrag) {
      this.overlayDemoDrag();
    }
  }
}
