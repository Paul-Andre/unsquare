"use strict";

import { GameBase } from './GameBase.js';
import { calculateStates, LEVEL_STATES } from '../ui/LevelMenuComponent.js';
import { vector_sum, vector_simplify_arithmetic, level_get_arithmetic, vector_sub, operation_index_to_move, level_get_geometry } from '../core/algo.js';
import { save_editor_book } from '../core/bookUtils.js';
import { trackLevelEnd } from '../utils/analytics.js';
import { getBestNumMoves, setBestNumMoves } from '../core/levelUtils.js';
import * as config from '../utils/config.js';
import { renderHistogram } from '../ui/ChallengeHistogram.js';
import { drawIcon } from '../ui/icon.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../utils/api.js';


export class Game extends GameBase {
  constructor(canvasId, divId) {
    super(canvasId, divId);
    // Bind the action method to preserve 'this' context when passed as callback
    this.action = this.action.bind(this);

    this.numMoves = 0;
    this.playerSolution = null; // Solution vector starting from zero (player's moves only)

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

    // Hint system properties
    this.hintState = null; // null when no hint, or { hintSquare: {x, y, size} | null, suggestRestart: boolean }
  }

  // this specifies what happens when you activate squares
  action(v) {
    return this.level.colorScheme.unsquare(v);
  }

  // Game-specific logic for mouse down
  onMouseDown() {
    this.hideFinishedLevelElements();
  }

  // Override openLevel to initialize playerSolution
  openLevel(level, book) {
    super.openLevel(level, book);
    this.numMoves = 0;
    // Initialize playerSolution to zero vector
    this.playerSolution = new Array(this.operations.length).fill(0);
    // Reset hint state
    this.hintState = null;
  }

  // Hook to add additional state to undo
  getAdditionalState() {
    return {
      numMoves: this.numMoves,
      playerSolution: this.playerSolution.slice(),
      hintState: this.hintState ? {
        hintSquare: this.hintState.hintSquare ? {...this.hintState.hintSquare} : null,
        suggestRestart: this.hintState.suggestRestart,
      } : null,
    };
  }

  // Hook to restore additional state from undo
  restoreAdditionalState(additionalState) {
    this.numMoves = additionalState.numMoves;
    this.playerSolution = additionalState.playerSolution.slice();
    this.hintState = additionalState.hintState ? {
      hintSquare: additionalState.hintState.hintSquare ? {...additionalState.hintState.hintSquare} : null,
      suggestRestart: additionalState.hintState.suggestRestart,
    } : null;
  }

  // Save state before a move is applied
  preMove(move) {
    // Clear hint state when a move is made
    this.hintState = null;
    // Track the move in playerSolution
    // We compute the vector from the move before applying it
    if (move != null && this.inverseOperations && this.playerSolution) {
      // Create a temporary grid to compute the vector
      let vector = this.level.tileShape.moveToVector(this.tiles, move);
      let opIndex = this.inverseOperations.get(vector.join(""));
      if (opIndex !== undefined) {
        this.playerSolution[opIndex] += 1;
      }
    }
    this.numMoves += 1;
  }

  // Game-specific logic after a move
  postMove() {
    this.sanityCheck();
    if (this.isFinished()) {
      this.finishedLevel();
    }
  }

  sanityCheck() {
    if (this.tiles === null) {
      return;
    }
    if (this.numMoves != vector_sum(this.getPlayerSolution())) {
      console.error("numMoves", this.numMoves, "does not match solution", vector_sum(this.getPlayerSolution()), this.getPlayerSolution());
      console.error("this.tiles", this.tiles);
      console.error("this.playerSolution", this.playerSolution, vector_sum(this.playerSolution));
      console.error("this.level.solutionVector", this.level.solutionVector, vector_sum(this.level.solutionVector));
      console.error("this.level.solutionType", this.level.solutionType);

    }
  }

  restart() {
    // Save current state for undo before restarting
    // TODO: saving and restoring the undo list is a bit of a hack. We do it because the way way we restart the level is
    // by simply reopening it, which resets the undoList. Ideally we would want to either split openLevel into two functions,
    // or have dedicated restart logic.
    let savedUndoList = null;
    if (this.tiles && this.numMoves > 0) {
      // Save undo state using unified system
      this.saveUndoState("restart");
      // Save the undo list (including the restart state we just added)
      savedUndoList = [...this.undoList];
    }
    const shouldShowHint = !!(this.hintState?.suggestRestart);
    
    this.openLevel(this.level, this.book);

    // Restore the undo list after creating new game state
    if (savedUndoList) {
      this.undoList = savedUndoList;
    }

    // Show hint after restart
    if (shouldShowHint) {
      this.showHint();
    }

    this.draw();
    // Force an immediate redraw to ensure canvas updates
    this.forceRedraw();
  }

  isFinished() {
    return this.tiles && !this.tiles.some(v => v != 1);
  }

  postSolutionToServer(callback) {
    const level = this.level;
    const solution = this.getPlayerSolution();
    const player_id = localStorage.player_id;
    console.log("solution to be posted", JSON.stringify(solution));
    
    (async () => {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/validate-and-save-solution`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
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
    return this.playerSolution.slice();
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

    let numMoves = this.numMoves;

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
    renderHistogram(container, this.allHistogramData[select.value], this.numMoves);
  }


  showFinishedLevelChallenge() {
    const element = this.getElement("finishedChallengeHistogram");
    const numMoves = this.numMoves;
    const movesDisplay = element.querySelector(".finishedLevelMoves");
    if (movesDisplay) {
      movesDisplay.innerText = `${numMoves} moves`;
    }

    // Generate level preview icon
    const previewImg = element.querySelector(".finishedChallengeLevelPreview");
    if (previewImg && this.level) {
      const canvas = document.createElement("canvas");
      const size = 55 * (window.devicePixelRatio || 1);
      canvas.width = size;
      canvas.height = size;
      drawIcon(this.level, canvas);
      const dataURL = canvas.toDataURL();
      previewImg.src = dataURL;
      previewImg.style.width = "55px";
      previewImg.style.height = "55px";
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
    if (!this.level || !this.tiles) {
      return;
    }

    if (config.ONBOARDING_HINTS) {
      this.updateDemoDrag();
      this.updateRestartButton();
    }

    // Update hint button visibility
    this.updateHintButtonVisibility();

    // Update hint UI
    this.updateHintUI();

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

  updateHintButtonVisibility() {
    const hintButton = this.div.querySelector(".hint_button");
    if (hintButton) {
      hintButton.style.display = this.level.par !== null ? "" : "none";
    }
  }

  updateHintUI() {
    const blockingOverlay = this.div.querySelector(".hint_blocking_overlay");
    const restartButton = this.div.querySelector(".restart_button");
    const arrowOverlay = this.div.querySelector(".hint_arrow_overlay");
    const suggestRestart = this.hintState?.suggestRestart || false;

    // Update blocking overlay and canvas pointer events
    if (blockingOverlay) {
      blockingOverlay.style.display = suggestRestart ? "block" : "none";
      this.canvas.style.pointerEvents = suggestRestart ? "none" : "auto";
    }

    // Update restart button styling
    if (restartButton) {
      restartButton.classList.toggle("hint_suggest_restart", suggestRestart);
    }

    // Update arrow overlay
    if (arrowOverlay) {
      if (suggestRestart && restartButton) {
        arrowOverlay.style.display = "block";
        this.positionHintArrow(arrowOverlay, restartButton);
      } else {
        arrowOverlay.style.display = "none";
      }
    }
  }

  // Position hint arrow to point at restart button
  positionHintArrow(arrowOverlay, restartButton) {
    const buttonRect = restartButton.getBoundingClientRect();
    const contentRect = this.div.querySelector(".content").getBoundingClientRect();
    const canvasRect = this.canvas.getBoundingClientRect();
    
    // Position arrow between canvas and restart button
    const arrowX = canvasRect.right + 20;
    const arrowY = buttonRect.top + buttonRect.height / 2 - 50;
    
    arrowOverlay.style.left = `${arrowX - contentRect.left}px`;
    arrowOverlay.style.top = `${arrowY - contentRect.top}px`;
  }

  updateDemoDrag() {
    this.demoDrag = (this.level.id == "level_1693531796434" && this.numMoves == 0)
      ? this.firstDemoDrag
      : null;
  }

  updateRestartButton() {
    const suggestsRestart = 
      (this.level.id == "level_1693531796434" && this.numMoves >= 1 && !this.isFinished()) ||
      (this.isInBasicBook() && this.level.index < 10 && this.level.par !== null && this.numMoves > this.level.par * 3 && !this.isFinished());

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
    } else {
      nextButton.textContent = "Return";
      nextButton.onclick = () => window.screenManager.goBack();
    }
  }

  showFinishedLevel() {

    if (this.book.id === "book_1762877873556" && this.level.index >= this.book.levels.length - 1) {
      this.getElement("finishedGame").style.display = "block";
    }

    const isPerfect = this.level.par !== null && this.numMoves <= this.level.par;
    const element = this.getElement(isPerfect ? "finishedLevelPerfect" : "finishedLevel");
    
    if (isPerfect) {
      element.classList.toggle("withGoldenGlow", config.PERFECT_SCREEN_GOLDEN_GLOW);
    }

    element.style.display = "block";
    const movesDisplay = element.querySelector(".finishedLevelMoves");
    if (movesDisplay) {
      const parDisplay = this.level.par === null ? "?" : this.level.par;
      movesDisplay.innerText = `${this.numMoves}/${parDisplay} moves`;
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
    if (this.tiles) {
      this.getElement("movesContent").innerText = this.numMoves;
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
      level.isCustom ? `creator par: ${parDisplay}` : `par: ${parDisplay}`;

    const index = level.index;
    const levelDisplay = level.isCustom ? "Custom Level" : (level.title || `Level ${1 + index}`);
    document.getElementById("LevelIndicator").innerText = levelDisplay;

    const states = calculateStates(this.book);
    this.updateNavigationButtons(index, states);

    // Update hint button visibility
    this.updateHintButtonVisibility();
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
    super.undo();
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
        (timestamp - this.lastUpdateTimestamp) / 1500;
      this.demoDragTime %= 1;
      return true;
    }
    return false;
  }

  drawOverlays() {
    if (this.demoDrag) {
      this.overlayDemoDrag();
    }
    this.drawHintOverlay();
  }


  // Check if player solution aligns with level solution
  checkSolutionAlignment() {
    if (!this.playerSolution || !this.level.solutionVector) {
      return false;
    }
    
    if (this.playerSolution.length !== this.level.solutionVector.length) {
      return false;
    }
    
    // Check alignment: for each i, playerSolution[i] <= solutionVector[i]
    return this.playerSolution.every((val, i) => val <= this.level.solutionVector[i]);
  }

  // Find the next move in the solution
  findNextHintMove() {
    if (!this.playerSolution || !this.level.solutionVector || !this.operations) {
      return null;
    }
    
    // Find first operation index where playerSolution[i] < solutionVector[i]
    const opIndex = this.playerSolution.findIndex((val, i) => val < this.level.solutionVector[i]);
    if (opIndex === -1) {
      return null; // No more moves needed
    }
    
    return operation_index_to_move(level_get_geometry(this.level), opIndex);
  }

  showHint() {
    if (!this.level || !this.tiles || !this.level.solutionVector) {
      return;
    }
    
    // Save state to undo system
    this.saveUndoState(null);
    
    // Check alignment
    const isAligned = this.checkSolutionAlignment();
    
    if (!isAligned) {
      // Misaligned: suggest restart
      this.hintState = { suggestRestart: true, hintSquare: null };
    } else {
      // Aligned: find next hint square
      const hintSquare = this.findNextHintMove();
      this.hintState = hintSquare ? { hintSquare, suggestRestart: false } : null;
    }
    
    // Update UI and redraw
    this.updateGui();
    this.draw();
  }

  drawHintOverlay() {
    if (!this.hintState?.hintSquare) {
      return;
    }
    
    const square = this.hintState.hintSquare;
    const width = this.canvas.width / (this.tiles.width + 0.1);
    const height = this.canvas.height / (this.tiles.height + 0.1);
    const padding = width * 0.1;
    
    // Calculate square bounds
    const squareX = square.x * width + padding;
    const squareY = square.y * height + padding;
    const squareWidth = width * square.size - padding;
    const squareHeight = height * square.size - padding;
    
    // Draw hint outline
    this.ctx.strokeStyle = "#ff6b6b"; // Red color for hint
    const dpi = window.devicePixelRatio || 1;
    this.ctx.lineWidth = 4 * dpi;
    this.ctx.setLineDash([8 * dpi, 4 * dpi]); // Dashed line
    this.ctx.strokeRect(squareX, squareY, squareWidth, squareHeight);
    this.ctx.setLineDash([]); // Reset to solid line
  }
}
