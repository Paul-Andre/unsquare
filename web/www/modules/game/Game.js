"use strict";

import { GameBase } from './GameBase.js';
import { calculateStates, LEVEL_STATES } from '../ui/LevelMenuComponent.js';
import { vector_sum, vector_simplify_arithmetic, level_get_arithmetic, vector_sub } from '../core/algo.js';
import { save_editor_book } from '../core/bookUtils.js';
import { trackLevelEnd } from '../utils/analytics.js';
import { getBestNumMoves, setBestNumMoves } from '../core/levelUtils.js';
import * as config from '../utils/config.js';
import { renderHistogram, generateDummyHistogramData } from '../ui/ChallengeHistogram.js';


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
    this.allHistogramData = null;
  }

  // this specifies what happens when you activate squares
  action(v) {
    return this.level.colorScheme.unsquare(v);
  }

  // Game-specific logic for mouse down
  onMouseDown() {
    this.hideFinishedLevelElements();
  }

  // Game-specific logic after a move
  postMove() {
    this.sanityCheck();
    if (this.isFinished()) {
      this.finishedLevel();
    }
  }

  sanityCheck() {
    if (this.gameState === null) {
      return;
    }
    if (this.gameState.numMoves  != vector_sum(this.getPlayerSolution())) {
      console.error("numMoves", this.gameState.numMoves, "does not match solution", vector_sum(this.getPlayerSolution()), this.getPlayerSolution());
      console.error("this.gameState.tiles", this.gameState.tiles);
      console.error("this.gameState.runningSolution", this.gameState.runningSolution, vector_sum(this.gameState.runningSolution));
      console.error("this.level.solutionVector", this.level.solutionVector, vector_sum(this.level.solutionVector));
      console.error("this.level.solutionType", this.level.solutionType);
      console.error("this.level.solution", this.level.solution, vector_sum(this.level.solution));

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
    return this.gameState && !this.gameState.tiles.some(v => v != 1);
  }

  postSolutionToServer(callback) {
    const level = this.level;
    const solution = this.getPlayerSolution();
    const player_id = localStorage.player_id;
    console.log("solution to be posted", JSON.stringify(solution));

    const supabaseUrl = "https://vatpvuolfdnkcgdwgsxm.supabase.co";
    const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdHB2dW9sZmRua2NnZHdnc3htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MTc3OTMsImV4cCI6MjA3OTE5Mzc5M30.XEJsuWMrWzo1l2otg36z9uZ1Vm3BbItfnhb0r-Ne1NA";
    
    (async () => {
      const response = await fetch(`${supabaseUrl}/functions/v1/validate-and-save-solution`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        level_id: level.id,
        solution: solution,
        player_id: player_id,
        level_full_identifier: level.getFullIdentifier(),
      })
    });
    
    let data = null;
    
    try {
      if (response.ok) {
        data = await response.json();
      } else {
        console.error(`HTTP error! status: ${response.status}`, await response.text());
      }
    } catch (e) {
      if (response.ok) {
        console.error("Failed to parse response as JSON", e);
      } else {
        console.error(`HTTP error! status: ${response.status}`);
      }
    }
    console.log("data", data);

    this.allHistogramData = data.allHistogramData;

    callback();
  })();

  }

  getPlayerSolution() {
    // TODO: this stops working if the level.solutionVector is changed. So to use this I stop changing level.solutionVector.
    return vector_sub(
      this.gameState.runningSolution,
      this.level.solutionVector,
    );
  }

  finishedLevel() {
    let oldSum = vector_sum(this.level.solutionVector);
    let newSolution = this.getPlayerSolution();
    vector_simplify_arithmetic(newSolution, level_get_arithmetic(this.level));
    let newSum = vector_sum(newSolution);

    // TODO: this is some somewhat fragile code that tries to integrate with the editor...
    // if (newSum < oldSum) {
    //   this.level.solutionVector = newSolution;
    //   this.level.solutionType = "manual";
    //   save_editor_book(this.book);
    // }

    let prevBest = getBestNumMoves(this.level);

    let numMoves = this.gameState.numMoves;

    if (prevBest === null || numMoves < prevBest) {
      setBestNumMoves(this.level, numMoves);
    }

    trackLevelEnd(this.level, this.book);
    if (this.level.mode === "challenge") {
      this.postSolutionToServer(
        ()=>this.renderHistogram()
      );
    }

    this.numSolvedThisSession += 1;

    this.displayLevelGui(this.level);
    this.updateGui();
  }

  renderHistogram() {
    const element = this.getElement("finishedChallengeHistogram");
    const container = element.querySelector("#histogramBars");
    if (this.allHistogramData === null) {
      container.innerHTML = "loading...";
      return;
    }
    
    const select = element.querySelector("#histogramTypeSelect");
    renderHistogram(container, this.allHistogramData[select.value], this.gameState.numMoves);
  }


  showFinishedLevelChallenge() {
    const element = this.getElement("finishedChallengeHistogram");
    const numMoves = this.gameState.numMoves;
    const movesDisplay = element.querySelector(".finishedLevelMoves");
    if (movesDisplay) {
      movesDisplay.innerText = `${numMoves} moves`;
    }

    const select = element.querySelector("#histogramTypeSelect");

    if (this.histogramChangeHandler) {
      select.removeEventListener("change", this.histogramChangeHandler);
    }
    
    this.histogramChangeHandler = (e) => {
      this.renderHistogram();
    };
    
    select.addEventListener("change", this.histogramChangeHandler);

    this.renderHistogram();

    element.style.display = "block";
    this.updateFinishedLevelNextButton(element);
    requestAnimationFrame(() => element.classList.add("showing"));
  }

  hideFinishedLevelChallenge() {
    const element = this.getElement("finishedChallengeHistogram");
    element.style.display = "none";
    element.classList.remove("showing");
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
    if (!this.level || !this.gameState) {
      return;
    }

    if (config.ONBOARDING_HINTS) {
      this.updateDemoDrag();
      this.updateRestartButton();
    }

    if (this.isFinished()) {
      if (this.level.mode === "challenge") {
        this.showFinishedLevelChallenge();
      } else {
        this.showFinishedLevel();
      }
    } else {
      this.hideFinishedLevelElements();
    }

    this.updateMovesDisplay();
    this.updateBestDisplay();
  }

  updateDemoDrag() {
    this.demoDrag = (this.level.id == "level_1693531796434" && this.gameState.numMoves == 0)
      ? this.firstDemoDrag
      : null;
  }

  updateRestartButton() {
    const suggestsRestart = 
      (this.level.id == "level_1693531796434" && this.gameState.numMoves >= 1 && !this.isFinished()) ||
      (this.isInBasicBook() && this.level.index < 10 && this.level.par !== null && this.gameState.numMoves > this.level.par * 3 && !this.isFinished());

    const restartButton = this.div.getElementsByClassName("restart_button")[0];
    restartButton.classList.toggle("in_yo_face", suggestsRestart);
  }

  updateFinishedLevelNextButton(element) {
    const nextButton = element.querySelector(".finishedLevelNextButton");
    if (!nextButton) {
      return;
    }

    const hasNextLevel = this.level.index + 1 < this.book.levels.length;
    
    if (hasNextLevel) {
      nextButton.textContent = "Next →";
      nextButton.onclick = () => window.nextLevel();
      nextButton.ontouchend = () => window.nextLevel();
    } else {
      nextButton.textContent = "Return";
      nextButton.onclick = () => window.screenManager.goBack();
      nextButton.ontouchend = () => window.screenManager.goBack();
    }
  }

  showFinishedLevel() {

    if (this.book.id === "book_1762877873556" && this.level.index >= this.book.levels.length - 1) {
      this.getElement("finishedGame").style.display = "block";
    }

    const isPerfect = this.level.par !== null && this.gameState.numMoves <= this.level.par;
    const element = this.getElement(isPerfect ? "finishedLevelPerfect" : "finishedLevel");
    
    if (isPerfect) {
      element.classList.toggle("withGoldenGlow", config.PERFECT_SCREEN_GOLDEN_GLOW);
    }

    element.style.display = "block";
    const movesDisplay = element.querySelector(".finishedLevelMoves");
    if (movesDisplay) {
      const parDisplay = this.level.par === null ? "?" : this.level.par;
      movesDisplay.innerText = `${this.gameState.numMoves}/${parDisplay} moves`;
    }
    this.updateFinishedLevelNextButton(element);
    requestAnimationFrame(() => element.classList.add("showing"));
  }

  hideFinishedLevelElements() {
    const finishedLevel = this.getElement("finishedLevel");
    finishedLevel.style.display = "none";
    finishedLevel.classList.remove("showing");

    const finishedLevelPerfect = this.getElement("finishedLevelPerfect");
    finishedLevelPerfect.style.display = "none";
    finishedLevelPerfect.classList.remove("showing");

    this.getElement("finishedGame").style.display = "none";
    
    this.hideFinishedLevelChallenge();
  }

  updateMovesDisplay() {
    if (this.gameState) {
      this.getElement("movesContent").innerText = this.gameState.numMoves;
    }
  }

  updateBestDisplay() {
    const best = this.getCurrentBest();
    this.getElement("bestContent").innerText = best !== null ? best : "-";
  }

  getElement(className) {
    return this.div.getElementsByClassName(className)[0];
  }

  displayLevelGui(level) {
    this.hideFinishedLevelElements();

    document.getElementById("TextShower").innerText = level.text;
    const par = level.par;
    const parDisplay = par === null ? "?" : par;
    this.getElement("parContentInclusive").innerText = 
      level.custom ? `creator par: ${parDisplay}` : `par: ${parDisplay}`;

    const index = level.index;
    document.getElementById("LevelIndicator").innerText = 
      level.custom ? "Custom Level" : `Level ${1 + index}`;

    const states = calculateStates(this.book);
    this.updateNavigationButtons(index, states);
  }

  updateNavigationButtons(index, states) {
    const prevButton = this.div.querySelector("#prevButton");
    const prevIndex = index - 1;
    prevButton.toggleAttribute("disabled", prevIndex < 0 || states[prevIndex] <= LEVEL_STATES.LOCKED);

    const nextButton = this.div.querySelector("#nextButton");
    const nextIndex = index + 1;
    nextButton.toggleAttribute("disabled", nextIndex >= states.length || states[nextIndex] <= LEVEL_STATES.LOCKED);
  }

  undo() {
    this.gameState.undo();
    this.draw();
    // Start animation loop if animations were triggered
    this.startAnimationLoopIfNeeded();
  }

  checkShowOverlayMessage() {
    // TODO: when multiple books, rethink this.
    const totSolved = this.book.levels.filter(level => getBestNumMoves(level)).length;
    // Todo: make this be a parameter on posthog
    return totSolved >= 35 && this.numSolvedThisSession >= 10 && !this.showedDiscordOverlay;
  }

  nextLevel() {
    const discordEl = document.getElementById("discord_overlay_message");
    if (this.checkShowOverlayMessage()) {
      discordEl.hidden = false;
      this.showedDiscordOverlay = true;
      return;
    }

    discordEl.hidden = true;
    const nextIndex = this.level.index + 1;
    if (nextIndex < this.book.levels.length) {
      this.navigateToLevel(this.book.levels[nextIndex]);
    }
  }

  prevLevel() {
    const prevIndex = this.level.index - 1;
    if (prevIndex >= 0) {
      this.navigateToLevel(this.book.levels[prevIndex]);
    }
  }

  navigateToLevel(level) {
    this.openLevel(level, this.book);
    this.onShow();
    this.forceRedraw();
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

  dragBlend(x) {
    const bezier = this.bezierBlend(x);
    return this.interpolate(this.interpolate(this.interpolate(bezier, 1, x), 1, x), 1, x);
  }

  // Tutorial hint overlay drawing
  overlayDemoDrag() {
    if (!this.demoDrag) {
      return;
    }

    const width = this.canvas.width;
    const height = this.canvas.height;
    const relativeDragSize = 40 / config.MAX_WIDTH;
    const relativeLineSize = relativeDragSize * 0.75;

    // Draw line
    this.ctx.lineWidth = relativeLineSize * width;
    this.ctx.lineCap = "round";
    this.ctx.strokeStyle = "#4fb6ff55";
    this.ctx.beginPath();
    this.ctx.moveTo(this.demoDrag.start.x * width, this.demoDrag.start.y * height);
    this.ctx.lineTo(this.demoDrag.end.x * width, this.demoDrag.end.y * height);
    this.ctx.stroke();

    // Draw animated bubble
    const easedTime = this.dragBlend(this.demoDragTime);
    const bubbleX = this.interpolate(this.demoDrag.start.x, this.demoDrag.end.x, easedTime) * width;
    const bubbleY = this.interpolate(this.demoDrag.start.y, this.demoDrag.end.y, easedTime) * height;
    const bubbleSize = relativeDragSize * width;

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
