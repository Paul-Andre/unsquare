"use strict";

import { GameBase } from './GameBase.ts';
import { calculateStates, LEVEL_STATES } from '../ui/LevelMenuComponent.ts';
import { obviousScore, vector_sum, vector_simplify_arithmetic, level_get_arithmetic, vector_sub, operation_index_to_move, level_get_geometry, eric_partition_number, vector_equal } from '../core/algo';
import { save_editor_book } from '../core/bookUtils.ts';
import { trackLevelEnd } from '../utils/analytics.ts';
import { getBestNumMoves, setBestNumMoves, getCachedChallengeStatistics, saveChallengeStatistics } from '../core/levelUtils.ts';
import * as config from '../utils/config.ts';
import { renderHistogram } from '../ui/ChallengeHistogram.ts';
import { drawIcon, getCachedLevelIconDataUrl } from '../ui/icon.ts';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../utils/api.ts';
import { assert, bezierBlend, cast, ensureNotNull, interpolate } from '../utils/helpers.ts';
import { screenManager } from '../ui/ScreenManager.ts';
import { Level } from '../core/Level.ts';
import { Book } from '../core/Book.ts';
import { Move } from './GameBase.ts';

const firstDemoDrag = {
  start: { x: 0.33, y: 0.33 },
  end: { x: 0.67, y: 0.67 },
};


export class Game extends GameBase {
  numMoves: number;
  playerSolution: number[] | null;
  numSolvedThisSession: number;
  showedDiscordOverlay: boolean;
  demoDrag: {start: {x: number, y: number}, end: {x: number, y: number}} | null;
  demoDragTime: number;
  allHistogramData: any | null;
  hintState: {
    hintSquare: { x: number; y: number; size: number; } | null;
    suggestRestart: boolean;
  } | null;

  viewHistogramChangeHandler: ((e: Event) => void) | null = null;
  histogramChangeHandler: any;

  constructor(root: HTMLElement, canvas: HTMLCanvasElement) {
    super(root, canvas);
    // Bind the action method to preserve 'this' context when passed as callback
    this.action = this.action.bind(this);

    this.numMoves = 0;
    this.playerSolution = null; // Solution vector starting from zero (player's moves only)

    this.numSolvedThisSession = 0;
    this.showedDiscordOverlay = false;

    // Tutorial hint system properties
    this.demoDrag = null;
    this.demoDragTime = 0;
    this.allHistogramData = null;

    // Hint system properties
    this.hintState = null; // null when no hint, or { hintSquare: {x, y, size} | null, suggestRestart: boolean }
  }

  // this specifies what happens when you activate squares
  override action = (v: number): number => {
    assert(this.level !== null);
    return this.level.colorScheme.unsquare(v);
  }

  // Game-specific logic for mouse down
  override onMouseDown(): void {
    this.hideFinishedLevelElements();
  }

  override specificOpenLevel(level: Level, book: Book): void {
    this.numMoves = 0;
    assert(this.operations !== null);
    this.playerSolution = new Array(this.operations.length).fill(0);
    this.hintState = null;
  }

  // Hook to add additional state to undo
  getAdditionalState(): unknown {
    assert(this.playerSolution !== null);
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
  restoreAdditionalState(additionalState: any): void {
    this.numMoves = additionalState.numMoves;
    this.playerSolution = additionalState.playerSolution.slice();
    this.hintState = additionalState.hintState ? {
      hintSquare: additionalState.hintState.hintSquare ? {...additionalState.hintState.hintSquare} : null,
      suggestRestart: additionalState.hintState.suggestRestart,
    } : null;
  }

  // Save state before a move is applied
  override preMove(move: Move): void {
    // Clear hint state when a move is made
    this.hintState = null;
    // Track the move in playerSolution
    // We compute the vector from the move before applying it
    if (move != null && this.inverseOperations && this.playerSolution) {
      // Create a temporary grid to compute the vector
      assert(this.level !== null);
      assert(this.tiles !== null);
      let vector = this.level.tileShape.moveToVector(this.tiles, move);
      let opIndex = this.inverseOperations.get(vector.join(""));
      if (opIndex !== undefined) {
        this.playerSolution[opIndex] += 1;
      }
    }
    this.numMoves += 1;
  }

  // Game-specific logic after a move
  override postMove(): void {
    this.sanityCheck();
    if (this.isFinished()) {
      this.finishedLevel();
    }
  }

  sanityCheck(): void {
    if (this.tiles === null) {
      return;
    }
    const playerSolution = this.playerSolution;
    assert(playerSolution !== null);
    if (this.numMoves != vector_sum(playerSolution)) {
      console.error("numMoves", this.numMoves, "does not match solution", vector_sum(playerSolution), playerSolution);
      console.error("this.tiles", this.tiles);
      console.error("this.playerSolution", this.playerSolution, vector_sum(this.playerSolution!));
      assert(this.level !== null);
      console.error("this.level.solutions", this.level.solutions, this.level.solutions && this.level.solutions.length > 0 ? vector_sum(this.level.solutions[0]) : null);
      console.error("this.level.solutionType", this.level?.solutionType);
    }
  }

  restart(): void {
    // Save current state for undo before restarting
    // TODO: We save and restore the undo list this waybecause the way we restart the level is
    // by simply reopening it, which resets the undoList. Ideally we should either split openLevel into two functions,
    // or have dedicated restart logic.
    let savedUndoList = null;
    if (this.tiles && this.numMoves > 0) {
      this.saveUndoState("restart");
      savedUndoList = [...this.undoList];
    }
    
    const shouldShowHint = !!(this.hintState?.suggestRestart);
    assert(this.level !== null);
    assert(this.book !== null);
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

  postSolutionToServer(callback: () => void): void {
    const level = this.level;
    assert(level !== null);
    const solution = this.playerSolution;
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
    // Cache challenge statistics if available
    if (data.player_summary && level.mode === "challenge") {
      saveChallengeStatistics(level.id, data.player_summary);
    }

    callback();
  })();

  }

  async fetchHistogramData() {
    const level = this.level;
    if (!level || level.mode !== "challenge") {
      return null;
    }

    const player_id = localStorage.player_id;
    if (!player_id) {
      return null;
    }

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_player_level_histograms_and_summary`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          p_player_id: player_id,
          p_level_id: level.id
        })
      });

      console.log(response);

      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`, await response.text());
        return null;
      }

      const data = await response.json();
      console.log(data);
      
      // Cache challenge statistics if available
      if (data.player_summary && level.mode === "challenge") {
        saveChallengeStatistics(level.id, data.player_summary);
      }

      // Return the histogram data (same structure as before)
      return data.histogram;
    } catch (e) {
      console.error("Failed to fetch histogram data", e);
      return null;
    }
  }

  async showHistogramView(): Promise<void> {
    if (!this.level || this.level.mode !== "challenge") {
      return;
    }

    const element = this.getElement("viewHistogramOverlay");
    assert(element instanceof HTMLElement);

    // Check if overlay is already open - if so, close it
    const isOpen = element.classList.contains("showing") || 
                   (element instanceof HTMLElement && element.style.display === "block");
    if (isOpen) {
      this.hideHistogramView();
      return;
    }

    // Generate level preview icon
    const previewImg = element.querySelector(".challengeLevelPreview");
    if (previewImg && this.level && previewImg instanceof HTMLImageElement) {
      const dataURL = getCachedLevelIconDataUrl(this.level);
      previewImg.src = dataURL;
      previewImg.style.width = `${config.ICON_SIZE}px`;
      previewImg.style.height = `${config.ICON_SIZE}px`;
    }

    // Set up dropdown change handler
    const select = element.querySelector("#viewHistogramTypeSelect");
    if (select instanceof HTMLSelectElement) {
      if (this.viewHistogramChangeHandler) {
        select.removeEventListener("change", this.viewHistogramChangeHandler);
      }
      
      this.viewHistogramChangeHandler = (e) => {
        this.renderViewHistogram();
      };
      
      select.addEventListener("change", this.viewHistogramChangeHandler);
    }

    // Render the histogram with whatever data is available (or show loading)
    this.renderViewHistogram();

    // Show the overlay immediately
    element.style.display = "block";
    requestAnimationFrame(() => element.classList.add("showing"));

    // Fetch histogram data asynchronously and update when it arrives
    const histogramData = await this.fetchHistogramData();
    if (histogramData) {
      // Store the data
      this.allHistogramData = histogramData;
      // Update the histogram display
      this.renderViewHistogram();
    } else {
      // Show error message if fetch failed
      const container = element.querySelector("#viewHistogramBars");
      if (container) {
        container.innerHTML = "<p>No data available</p>";
      }
    }
  }

  renderViewHistogram(): void {
    const element = this.getElement("viewHistogramOverlay");
    if (!(element instanceof HTMLElement)) {
      return;
    }

    const container = element.querySelector("#viewHistogramBars");
    if (!(container instanceof HTMLElement)) {
      return;
    }

    if (this.allHistogramData === null) {
      container.innerHTML = "loading...";
      return;
    }
    
    const select = element.querySelector("#viewHistogramTypeSelect");
    if (!select || !(select instanceof HTMLSelectElement)) {
      return;
    }
    assert(this.level !== null);
    const playerMoves = getBestNumMoves(this.level);
    renderHistogram(container, this.allHistogramData[select.value], playerMoves);
  }

  hideHistogramView(): void {
    const element = this.getElement("viewHistogramOverlay");
    if (element instanceof HTMLElement) {
      element.style.display = "none";
      element.classList.remove("showing");
    }
  }

  finishedLevel(): void {
    assert(this.level !== null);
    if (!this.level.solutions || this.level.solutions.length === 0) {
      // No existing solutions, just set the player solution
      this.level.solutions = [ensureNotNull(this.playerSolution).slice()];
      this.level.solutionType = "manual";
    } else {
      let oldSum = vector_sum(this.level.solutions[0]);
      let newSolution = ensureNotNull(this.playerSolution).slice();
      //vector_simplify_arithmetic(newSolution, level_get_arithmetic(this.level));
      let newSum = vector_sum(newSolution);

      if (newSum < oldSum) {
        // Player solution is better, replace entire array
        this.level.solutions = [newSolution];
        this.level.solutionType = "manual";
      } else if (newSum === oldSum) {
        // Player solution is equal, check if it's already in the array
        let isAlreadyInArray = this.level.solutions.some(sol => vector_equal(sol, newSolution));
        if (!isAlreadyInArray) {
          this.level.solutions.push(newSolution);
        }
      }
    }

    let prevBest = getBestNumMoves(this.level);

    let numMoves = this.numMoves;

    if (prevBest === null || numMoves < prevBest) {
      setBestNumMoves(this.level, numMoves);
    }

    assert(this.book !== null);
    trackLevelEnd(this.level, this.book);
    if (this.level.mode === "challenge") {
      this.postSolutionToServer(
        ()=>{
          this.renderHistogram();
          this.level && this.displayLevelGui(this.level);
          this.updateGui();
        }
      );
    }

    this.numSolvedThisSession += 1;

    this.displayLevelGui(this.level);
    this.updateGui();
  }

  renderHistogram() {
    const element = this.getElement("finishedChallengeHistogram");
    const container = element.querySelector("#histogramBars");
    assert(container instanceof HTMLElement);
    if (this.allHistogramData === null) {
      container.innerHTML = "loading...";
      return;
    }
    
    const select = element.querySelector("#histogramTypeSelect");
    assert(select instanceof HTMLSelectElement);
    renderHistogram(container, this.allHistogramData[select.value], this.numMoves);
  }


  showFinishedLevelChallenge() {
    const element = this.getElement("finishedChallengeHistogram");
    assert(element instanceof HTMLElement);

    const numMoves = this.numMoves;
    const movesDisplay = element.querySelector(".finishedLevelMoves");
    assert(movesDisplay instanceof HTMLElement);
    if (movesDisplay) {
      movesDisplay.innerText = `${numMoves} moves`;
    }

    // Generate level preview icon
    const previewImg = element.querySelector(".challengeLevelPreview");
    assert(previewImg instanceof HTMLImageElement);
    if (previewImg && this.level) {
      const dataURL = getCachedLevelIconDataUrl(this.level);
      previewImg.src = dataURL;
      previewImg.style.width = `${config.ICON_SIZE}px`;
      previewImg.style.height = `${config.ICON_SIZE}px`;
    }

    const select = element.querySelector("#histogramTypeSelect");
    assert(select instanceof HTMLSelectElement);

    if (this.histogramChangeHandler) {
      select.removeEventListener("change", this.histogramChangeHandler);
    }
    
    this.histogramChangeHandler = (e: Event) => {
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
    assert(element instanceof HTMLElement);
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
    if (!this.book) {
      return false;
    }
    return this.book.source?.endsWith(".json") ?? false;
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
    if (hintButton instanceof HTMLElement) {
      let visible = this.level?.par !== null;
      hintButton.style.display = visible ? "" : "none";
    }
  }

  updateHintUI() {
    const suggestRestart = this.hintState?.suggestRestart || false;

    // Update blocking overlay and canvas pointer events
    const blockingOverlay = this.div.querySelector(".hint_blocking_overlay");
    if (blockingOverlay instanceof HTMLElement) {
      blockingOverlay.style.display = suggestRestart ? "block" : "none";
      this.canvas.style.pointerEvents = suggestRestart ? "none" : "auto";
    }

    // Update restart button styling
    const restartButton = this.div.querySelector(".restart_button");
    if (restartButton instanceof HTMLElement) {
      restartButton.classList.toggle("hint_suggest_restart", suggestRestart);
    }

    // Update arrow overlay
    const arrowOverlay = this.div.querySelector(".hint_arrow_overlay");
    if (arrowOverlay instanceof HTMLElement) {
      if (suggestRestart && restartButton instanceof HTMLElement) {
        arrowOverlay.style.display = "block";
        this.positionHintArrow(arrowOverlay, restartButton);
      } else {
        arrowOverlay.style.display = "none";
      }
    }
  }

  // TODO: Completely redo this.
  positionHintArrow(arrowOverlay: HTMLElement, restartButton: HTMLElement): void {
    assert(this.div.querySelector(".content") !== null);
    const buttonRect = restartButton.getBoundingClientRect();
    const contentRect = ensureNotNull(this.div.querySelector(".content")).getBoundingClientRect();
    const canvasRect = this.canvas.getBoundingClientRect();
    
    // Position arrow between canvas and restart button
    const arrowX = canvasRect.right + 20;
    const arrowY = buttonRect.top + buttonRect.height / 2 - 50;
    
    arrowOverlay.style.left = `${arrowX - contentRect.left}px`;
    arrowOverlay.style.top = `${arrowY - contentRect.top}px`;
  }

  updateDemoDrag(): void {
    this.demoDrag = (this.level?.id == "level_1693531796434" && this.numMoves == 0)
      ? firstDemoDrag
      : null;
  }

  updateRestartButton() {
    if (!this.level) {
      return;
    }
    const suggestsRestart = 
      (this.level.id == "level_1693531796434" && this.numMoves >= 1 && !this.isFinished()) ||
      (this.isInBasicBook() && this.level.index < 10 && this.level.par !== null && this.numMoves > this.level.par * 3 && !this.isFinished());

    const restartButton = this.div.getElementsByClassName("restart_button")[0];
    restartButton.classList.toggle("in_yo_face", suggestsRestart);
  }

  updateFinishedLevelNextButton(element: HTMLElement): void {
    const nextButton = element.querySelector(".finishedLevelNextButton");
    if (!(nextButton instanceof HTMLElement)) {
      return;
    }
    assert(this.level !== null);
    assert(this.book !== null);
    const hasNextLevel = this.level.index + 1 < this.book.levels.length;
    
    if (hasNextLevel) {
      nextButton.textContent = "Next →";
      nextButton.onclick = () => this.nextLevel();
    } else {
      nextButton.textContent = "Return";
      nextButton.onclick = () => screenManager.goBack();
    }
  }

  showFinishedLevel(): void {
    if (!this.level || !this.book) {
      return;
    }

    if (this.book.id === "book_1762877873556" && this.level.index >= this.book.levels.length - 1) {
      const finishedGame = this.getElement("finishedGame");
      if(finishedGame instanceof HTMLElement) {
      finishedGame.style.display = "block";
      }
    }

    const isPerfect = this.level.par !== null && this.numMoves <= this.level.par;
    const element = this.getElement(isPerfect ? "finishedLevelPerfect" : "finishedLevel");
    assert(element instanceof HTMLElement);
    
    if (isPerfect) {
      element.classList.toggle("withGoldenGlow", config.PERFECT_SCREEN_GOLDEN_GLOW);
    }

    element.style.display = "block";
    const movesDisplay = element.querySelector(".finishedLevelMoves");
    if (movesDisplay instanceof HTMLElement) {
      const parDisplay = this.level.par === null ? "?" : this.level.par;
      movesDisplay.innerText = `${this.numMoves}/${parDisplay} moves`;
    }
    this.updateFinishedLevelNextButton(element);
    requestAnimationFrame(() => element.classList.add("showing"));
  }

  hideFinishedLevelElements() {
    const finishedLevel = this.getElement("finishedLevel");
    assert(finishedLevel instanceof HTMLElement);
    finishedLevel.style.display = "none";
    finishedLevel.classList.remove("showing");

    const finishedLevelPerfect = this.getElement("finishedLevelPerfect");
    assert(finishedLevelPerfect instanceof HTMLElement);
    finishedLevelPerfect.style.display = "none";
    finishedLevelPerfect.classList.remove("showing");

    const finishedGame = this.getElement("finishedGame");
    assert(finishedGame instanceof HTMLElement);
    finishedGame.style.display = "none";
    
    this.hideFinishedLevelChallenge();
    this.hideHistogramView();
  }

  updateMovesDisplay() {
    if (this.tiles) {
      const movesContent = this.getElement("movesContent");
      assert(movesContent instanceof HTMLElement);
      movesContent.innerText = this.numMoves.toString();
    }
  }

  updateBestDisplay() {
    const best = this.getCurrentBest();
    const bestContent = this.getElement("bestContent");
    assert(bestContent instanceof HTMLElement);
    bestContent.innerText = best !== null ? best.toString() : "-";
  }

  getElement(className: string): Element {
    return this.div.getElementsByClassName(className)[0];
  }

  getLevelArrayIndex(level: Level): number {
    return level.index;
  }

  // Helper: Calculate display index for a level (excluding hidden levels)
  // TODO: this should not be recomputed like this every time for every level.
  getLevelDisplayIndex(level: Level): number {
    if (!this.book) {
      return 0;
    }
    let displayIndex = 0;
    const currentArrayIndex = this.getLevelArrayIndex(level);
    for (let i = 0; i < currentArrayIndex; i++) {
      if (!this.book.levels[i].hidden) {
        displayIndex++;
      }
    }
    return displayIndex;
  }

  // Helper: Find next visible (non-hidden) level starting from startIndex
  findNextVisibleLevel(startIndex: number): number {
    if (!this.book) {
      return -1;
    }
    for (let i = startIndex + 1; i < this.book.levels.length; i++) {
      if (!this.book.levels[i].hidden) {
        return i;
      }
    }
    return -1;
  }

  // Helper: Find previous visible (non-hidden) level starting from startIndex
  findPrevVisibleLevel(startIndex: number): number {
    if (!this.book) {
      return -1;
    }
    for (let i = startIndex - 1; i >= 0; i--) {
      if (!this.book.levels[i].hidden) {
        return i;
      }
    }
    return -1;
  }

  override displayLevelGui(level: Level): void {
    this.hideFinishedLevelElements();

    const textShower = this.div.querySelector("#TextShower");
    if (textShower instanceof HTMLElement) {
      textShower.innerText = level.text;
    }

    // Handle par/top indicator
    const parIndicator = this.getElement("parContentInclusive");
    assert(parIndicator instanceof HTMLElement);
    const parTextSpan = parIndicator.querySelector(".parText");
    if (level.mode === "challenge") {
      const cachedStats = getBestNumMoves(level) !== null 
        ? getCachedChallengeStatistics(level.id) 
        : null;
      const topBest = cachedStats?.top_best ?? null;
      if (parTextSpan instanceof HTMLElement) {
        parTextSpan.innerText = `top: ${topBest !== null ? topBest : "?"}`;
      } else {
        parIndicator.innerText = `top: ${topBest !== null ? topBest : "?"}`;
      }
      
      // Show histogram icon only if player has solved the challenge
      const histogramIcon = this.div.querySelector("#histogramViewIcon");
      if (histogramIcon instanceof HTMLElement) {
        histogramIcon.style.display = getBestNumMoves(level) !== null ? "inline" : "none";
      }
    } else {
      const par = level.par;
      const showPar = !config.DONT_SHOW_PAR_FOR_UNSOLVED_LEVELS || getBestNumMoves(level) !== null;
      const parDisplay = (par === null || !showPar) ? "?" : par;
      const parText = level.isCustom ? `creator par: ${parDisplay}` : `par: ${parDisplay}`;
      if (parTextSpan instanceof HTMLElement) {
        parTextSpan.innerText = parText;
      } else {
        parIndicator.innerText = parText;
      }
      
      // Hide histogram icon for non-challenge levels
      const histogramIcon = this.div.querySelector("#histogramViewIcon");
      if (histogramIcon instanceof HTMLElement) {
        histogramIcon.style.display = "none";
      }
    }

    // Calculate display index (excluding hidden levels)
    let levelDisplay;
    if (level.title) {
      levelDisplay = level.title;
    } else if (level.isCustom) {
      levelDisplay = "Custom Level";
    } else {
      const index = this.getLevelDisplayIndex(level);
      levelDisplay = `Level ${1 + index}`
    };

    const levelIndicator = this.div.querySelector("#LevelIndicator");
    if (levelIndicator instanceof HTMLElement) {
      levelIndicator.innerText = levelDisplay;
    }

    if (this.book) {
      const states = calculateStates(this.book);
      this.updateNavigationButtons(states);
    }

    // Update hint button visibility
    this.updateHintButtonVisibility();
  }

  updateNavigationButtons(states: number[]): void {
    const currentArrayIndex = this.level ? this.getLevelArrayIndex(this.level) : null;

    const prevButton = this.div.querySelector("#prevButton");
    if (prevButton instanceof HTMLElement) {
      let dis = true;
      if (currentArrayIndex !== null) {
        const prevArrayIndex = this.findPrevVisibleLevel(currentArrayIndex);
        dis = prevArrayIndex < 0 || states[prevArrayIndex] <= LEVEL_STATES.LOCKED;
      }
      prevButton.toggleAttribute("disabled", dis);
    }

    const nextButton = this.div.querySelector("#nextButton");
    if (nextButton instanceof HTMLElement) {
      let dis = true;
      if (currentArrayIndex !== null) {
        const nextArrayIndex = this.findNextVisibleLevel(currentArrayIndex);
        dis = nextArrayIndex < 0 || states[nextArrayIndex] <= LEVEL_STATES.LOCKED
      }
      nextButton.toggleAttribute("disabled", dis);
    }
  }

  checkShowOverlayMessage(): boolean {
    if (!this.book) {
      return false;
    }
    // TODO: when multiple books, rethink this.
    const totSolved = this.book.levels.filter(level => getBestNumMoves(level)).length;
    // Todo: make this be a parameter on posthog
    return totSolved >= 35 && this.numSolvedThisSession >= 10 && !this.showedDiscordOverlay;
  }

  nextLevel(): void {
    const discordEl = this.div.querySelector("#discord_overlay_message");
    if (discordEl instanceof HTMLElement) {
      if (this.checkShowOverlayMessage()) {
        discordEl.hidden = false;
        this.showedDiscordOverlay = true;
        return;
      }

      discordEl.hidden = true;
    }
    if (!this.level || !this.book) {
      return;
    }
    const currentArrayIndex = this.getLevelArrayIndex(this.level);
    if (currentArrayIndex === null) return;
    
    const nextArrayIndex = this.findNextVisibleLevel(currentArrayIndex);
    if (nextArrayIndex >= 0) {
      this.navigateToLevel(this.book.levels[nextArrayIndex]);
    }
  }

  prevLevel(): void {
    if (!this.level || !this.book) {
      return;
    }
    const currentArrayIndex = this.getLevelArrayIndex(this.level);
    if (currentArrayIndex === null) return;
    
    const prevArrayIndex = this.findPrevVisibleLevel(currentArrayIndex);
    if (prevArrayIndex >= 0) {
      this.navigateToLevel(this.book.levels[prevArrayIndex]);
    }
  }

  // TODO: figure out whether this is the best place for this and how to deal with book.
  navigateToLevel(level: Level): void {
    assert(this.book !== null);
    this.openLevel(level, this.book);
    this.onShow();
    this.forceRedraw();
  }



  dragBlend(x: number): number {
    const bezier = bezierBlend(x);
    return interpolate(interpolate(interpolate(bezier, 1, x), 1, x), 1, x);
  }

  // Tutorial hint overlay drawing
  overlayDemoDrag(): void {
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
    const bubbleX = interpolate(this.demoDrag.start.x, this.demoDrag.end.x, easedTime) * width;
    const bubbleY = interpolate(this.demoDrag.start.y, this.demoDrag.end.y, easedTime) * height;
    const bubbleSize = relativeDragSize * width;

    this.ctx.fillStyle = "#4fb6ff55";
    this.ctx.beginPath();
    this.ctx.arc(bubbleX, bubbleY, bubbleSize, 0, 2 * Math.PI);
    this.ctx.fill();
  }

  // Hook methods for animation and drawing
  override hasAdditionalAnimations(): boolean {
    return this.demoDrag !== null;
  }

  override updateAdditionalAnimations(timestamp: number): boolean {
    if (this.demoDrag) {
      this.demoDragTime +=
        (timestamp - this.lastUpdateTimestamp) / 1500;
      this.demoDragTime %= 1;
      return true;
    }
    return false;
  }

  override drawOverlays(): void {
    if (this.demoDrag) {
      this.overlayDemoDrag();
    }
    this.drawHintOverlay();
  }

  // Find the next move in the solution
  // TODO: this should actually return a more involved object with a few other options,
  // perhaps instructions to undo a few moves, or instruction to restart.
  findNextHintMove(): Move | null {
    assert(this.level !== null);
    assert(this.playerSolution !== null);
    assert(this.level.solutions !== null);
    assert(this.level.solutions.length > 0);
    assert(this.operations !== null);
    
    // Helper function to check if player is aligned with a solution
    const isAlignedWithSolution = (solution: number[]): boolean => {
      assert(this.playerSolution!.length === solution.length);
      // Check alignment: for each i, playerSolution[i] <= solution[i]
      return this.playerSolution!.every((val, i) => val <= solution[i]);
    };
    
    // Filter to only solutions the player is aligned with
    const alignedSolutions = this.level.solutions.filter(isAlignedWithSolution);
    
    if (alignedSolutions.length === 0) {
      return null;
    }
    
    // For each possible operation remaining to be done, check across all aligned solutions.
    // Take the minimum eric_partition_number across all solutions for each move.
    let bestPartition = Infinity;
    let bestMoveIndex = -1;
    
    // Try each possible move
    for (let i = 0; i < this.operations.length; i++) {
      // Check if this move is valid for at least one aligned solution
      let isValidForAnySolution = false;
      let minPartitionForThisMove = Infinity;
      
      for (let solution of alignedSolutions) {
        let remainingSolution = vector_sub(solution, this.playerSolution);
        if (remainingSolution[i] == 0) continue;
        assert(remainingSolution[i] > 0);
        isValidForAnySolution = true;
        
        const newSolution = remainingSolution.slice();
        newSolution[i] -= 1;
        const partition = eric_partition_number(this.level, newSolution);
        //const partition = obviousScore(this.level, newSolution);
        minPartitionForThisMove = Math.min(minPartitionForThisMove, partition);
      }
      
      if (isValidForAnySolution && minPartitionForThisMove < bestPartition) {
        bestPartition = minPartitionForThisMove;
        bestMoveIndex = i;
      }
    }
    
    if (bestMoveIndex === -1) {
      return null;
    }
    return operation_index_to_move(level_get_geometry(this.level), bestMoveIndex);
  }

  getHint(): { hintSquare: { x: number; y: number; size: number; } | null; suggestRestart: boolean } | null {
    assert(this.level !== null);
    assert(this.playerSolution !== null);
    if (!this.level.solutions || this.level.solutions.length === 0 || !this.operations) {
      return null;
    }
    
    const hintSquare = this.findNextHintMove();
        
    if (hintSquare === null) {
      // Misaligned: suggest restart
      return { suggestRestart: true, hintSquare: null };
    } else {
      return { hintSquare, suggestRestart: false };
    }
  }

  showHint() {
    if (!this.level || !this.tiles || !this.level.solutions || this.level.solutions.length === 0) {
      return;
    }
    
    this.hintState = this.getHint();
    
    // Update UI and redraw
    this.updateGui();
    this.draw();
  }

  drawHintOverlay() {
    if (!this.hintState?.hintSquare) {
      return;
    }
    assert(this.tiles !== null);
    
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

const gameRoot = ensureNotNull(document.getElementById("game"));
const gameCanvas = cast(gameRoot.querySelector("#gameCanvas"), HTMLCanvasElement);
export const game = new Game(gameRoot, gameCanvas);