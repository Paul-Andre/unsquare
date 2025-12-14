"use strict";

import { BoundedGrid, GridFromArray } from 'modules/core/Grid.ts';
import { TileAnimationState } from '../core/TileAnimationState.ts';
import { compute_operations_for_level } from '../core/algo';
import { trackLevelStart } from '../utils/analytics.ts';
import * as config from '../utils/config.ts';
import { assert, cancelEvent, ensureNotNull } from '../utils/helpers.ts';
import { Book } from 'modules/core/Book.ts';
import { Level } from 'modules/core/Level.ts';

export type Move = {
  x: number;
  y: number;
  size: number;
};

/// This is what does the basics of drawing the tiles to the screen.
///
export abstract class GameBase {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  div: HTMLElement;
  mouseStart: {
    x: number;
    y: number;
    pressed: boolean;
  };
  mouseNow: {
    x: number;
    y: number;
  };
  hoveredTile: {
    x: number;
    y: number;
  } | null;
  tiles: BoundedGrid<number> | null;
  tileAnimationState: TileAnimationState | null;
  undoList: {
    tiles: BoundedGrid<number>;
    move: Move | "restart" | "other";
    additionalState: any;
  }[];
  lastUpdateTimestamp: number;
  operations: number[][] | null;
  inverseOperations: Map<string, number> | null;
  canvasVirtualSize: number;
  canvasSize: number;
  hidden: boolean;
  animationRunning: boolean;
  level: Level | null = null;
  book: Book | null = null;


  constructor(root: HTMLElement, canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = ensureNotNull(this.canvas.getContext("2d"));
    this.div = root;

    this.mouseStart = {
      x: 0,
      y: 0,
      pressed: false,
    };

    this.mouseNow = {
      x: 0,
      y: 0,
    };

    this.hoveredTile = null; // Track which tile is being hovered

    // Game state
    this.tiles = null;
    this.tileAnimationState = null;
    this.undoList = [];
    this.lastUpdateTimestamp = performance.now();
    this.operations = null;
    this.inverseOperations = null;

    this.canvasVirtualSize = 0;
    this.canvasSize = 0;

    // TODO: Make this not use CPU all the time
    this.hidden = true;
    // to make sure we don't requestAnimationFrame if it's already been requested
    // Animation system properties

    this.animationRunning = false;

    this.setupEventListeners();
    this.onResize();
  }

  onResize(): void {
    this.canvasVirtualSize = Math.min(
      this.div.offsetWidth,
      this.div.offsetHeight,
      config.MAX_WIDTH
    );

    this.canvasSize = this.canvasVirtualSize * (window.devicePixelRatio || 1);
    this.canvas.width = this.canvas.height = this.canvasSize;
    this.canvas.style.width = this.canvas.style.height =
      this.canvasVirtualSize + "px";
    this.draw();
  }

  specificOpenLevel(level: Level, book: Book): void {
    // Override in subclasses if needed
  }

  openLevel(level: Level, book: Book): void{
    this.tiles = level.tiles.clone();
    this.tileAnimationState = new TileAnimationState(this.tiles);
    this.undoList = [];
    this.lastUpdateTimestamp = performance.now();
    this.level = level;
    this.book = book;

    this.operations = compute_operations_for_level(this.level);
    this.inverseOperations = new Map();
    for (let i = 0; i < this.operations.length; i++) {
      this.inverseOperations.set(this.operations[i].join(""), i);
    }

    this.specificOpenLevel(level, book);

    trackLevelStart(level, book);

    this.mouseStart.pressed = false;

    this.displayLevelGui(level);
  }

  // TODO: remove glitch
  doMouseDown(x: number, y: number): void {
    this.mouseStart.x = x / this.canvasSize;
    this.mouseStart.y = y / this.canvasSize;
    this.mouseStart.pressed = true;

    if (!this.level || !this.tileAnimationState) {
      return;
    }

    // Immediately select the tile under the mouse cursor
    this.level.tileShape.select(
      this.mouseStart.x,
      this.mouseStart.y,
      this.mouseStart.x,
      this.mouseStart.y,
      this.tileAnimationState.grid
    );

    // Update inset states for immediate selection
    this.tileAnimationState.forEach(function (v) {
      if (v.selected) {
        v.insetState = 1;
      } else {
        v.insetState = 0;
      }
    });
    
    this.hoveredTile = null;

    // Redraw to show the selection
    this.forceRedraw();

    // Hook for subclasses to implement game-specific logic
    this.onMouseDown();
  }

  doMouseMove(x: number, y: number): void {
    if (!this.level || !this.tileAnimationState) {
      return;
    }

    this.mouseNow.x = x / this.canvasSize;
    this.mouseNow.y = y / this.canvasSize;

    if (this.mouseStart.pressed) {
      // Use the select method which properly handles single tile selection
      this.level.tileShape.select(
        this.mouseStart.x,
        this.mouseStart.y,
        x / this.canvasSize,
        y / this.canvasSize,
        this.tileAnimationState.grid
      );

      // Check if selection changed and redraw if needed
      let different = false;
      this.tileAnimationState.forEach(function (v) {
        if (v.selected != v.oldSelected) {
          different = true;
        }
        // Update inset state based on selection
        if (v.selected) {
          v.insetState = 1;
        } else {
          v.insetState = 0;
        }
      });

      if (different) {
        if (navigator.vibrate) {
          navigator.vibrate(2);
        }
        this.forceRedraw();
      }
    }
  }

  doMouseUp(x: number, y: number): void {
    if (!this.level || !this.tileAnimationState) {
      return;
    }
    if (this.mouseStart.pressed) {
      this.mouseStart.pressed = false;
      const move = this.level.tileShape.moveFromMousePositions(
        this.mouseStart.x,
        this.mouseStart.y,
        x / this.canvasSize,
        y / this.canvasSize,
        this.tileAnimationState.grid
      );

      if (move !== null) {
        // Hook for subclasses to save state before move
        this.saveUndoState(move);
        
        this.preMove(move);
        this.applyMove(move, this.action);
        this.tileAnimationState.forEach(function (v) {
          v.selected = false;
          v.insetState = 0;
          // v.transitionState = 0;
        });
        this.level.tileShape.forTilesInMove(
          this.tileAnimationState.grid,
          move,
          function (v) {
            v.transitionState = 0;
          }
        );

        // Update timestamp when starting animations to prevent huge delta time
        this.lastUpdateTimestamp = performance.now();

        if (navigator.vibrate) {
          navigator.vibrate(3);
        }
        // Game-specific logic moved to subclasses
        this.postMove();
      } else {
        // Clear selection for invalid moves (like single tile selection)
        this.tileAnimationState.forEach(function (v) {
          v.selected = false;
        });
      }
      this.draw();
      // Start animation loop if animations were triggered
      this.startAnimationLoopIfNeeded();
    }
  }

  // Handle mouse hover events
  handleMouseEnter(event: MouseEvent): void {
    // Mouse entered canvas
  }

  handleMouseLeave(event: MouseEvent): void {
    // Mouse left canvas - clear hover state
    this.hoveredTile = null;
    this.forceRedraw();
  }

  handleMouseMove(event: MouseEvent): void {
    if (!this.tiles) {
      return;
    }
    if (!this.mouseStart.pressed) {
      // Only handle hover when not dragging
      const coords = this.getCoordinates(event);
      const x = coords.x / this.canvasSize;
      const y = coords.y / this.canvasSize;

      // Convert to tile coordinates
      const tileX = Math.floor(x * this.tiles.width);
      const tileY = Math.floor(y * this.tiles.height);

      // Check if coordinates are within bounds
      if (
        tileX >= 0 &&
        tileX < this.tiles.width &&
        tileY >= 0 &&
        tileY < this.tiles.height
      ) {
        const newHoveredTile = { x: tileX, y: tileY };

        // Only redraw if hovered tile changed
        if (
          !this.hoveredTile ||
          this.hoveredTile.x !== newHoveredTile.x ||
          this.hoveredTile.y !== newHoveredTile.y
        ) {
          this.hoveredTile = newHoveredTile;
          this.forceRedraw();
        }
      } else {
        if (this.hoveredTile) {
          this.hoveredTile = null;
          this.forceRedraw();
        }
      }
    }
  }

  // Gets the coordinates of the touch/mouse relative to the canvas element.
  //http://www.jacklmoore.com/notes/mouse-position/
  getCoordinates(event: MouseEvent): {x: number, y: number} {
    const style = window.getComputedStyle(this.canvas, null);
    const borderLeftWidth = parseInt(style.borderLeftWidth, 10);
    const borderTopWidth = parseInt(style.borderTopWidth, 10);
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: Math.max(
        0,
        Math.min(
          this.canvas.width - 2,
          (event.clientX - rect.left - borderLeftWidth) *
            (window.devicePixelRatio || 1)
        )
      ),
      y: Math.max(
        0,
        Math.min(
          this.canvas.height - 2,
          (event.clientY - rect.top - borderTopWidth) *
            (window.devicePixelRatio || 1)
        )
      ),
    };
  }

  setupEventListeners() {
    const beginSliding = (e: MouseEvent): boolean => {
      const coords = this.getCoordinates(e);
      this.doMouseDown(coords.x, coords.y);
      return cancelEvent(e);
    };

    const slide = (e: MouseEvent): boolean => {
      const coords = this.getCoordinates(e);
      this.doMouseMove(coords.x, coords.y);
      return cancelEvent(e);
    };

    const stopSliding = (e: MouseEvent): boolean => {
      const coords = this.getCoordinates(e);
      this.doMouseUp(coords.x, coords.y);
      return cancelEvent(e);
    };

    this.canvas.addEventListener("pointerdown", beginSliding);
    this.canvas.addEventListener("pointermove", slide);
    this.canvas.addEventListener("pointerup", stopSliding);

    // Add mouse hover events
    this.canvas.addEventListener(
      "mouseenter",
      this.handleMouseEnter.bind(this)
    );
    this.canvas.addEventListener(
      "mouseleave",
      this.handleMouseLeave.bind(this)
    );
    this.canvas.addEventListener(
      "mousemove",
      this.handleMouseMove.bind(this)
    );

    window.addEventListener(
      "resize",
      () => {
        this.onResize();
      },
      false
    );
  }

  abstract updateGui(): void;

  draw(): void {
    this.updateGui();
    if (this.level && this.tiles && this.tileAnimationState) {
      // Update inset states before drawing
      this.tileAnimationState.forEach(tileState => {
        if (tileState.selected) {
          tileState.insetState = 1;
        } else {
          tileState.insetState = 0;
        }
      });

      // Draw once immediately
      this.drawCanvas();

      // Start animation loop if there are actual animations
      this.startAnimationLoopIfNeeded();
    }
  }

  actuallyDrawCanvas(): void {
    if (!this.level || !this.tiles || !this.tileAnimationState) {
      return;
    }
    this.level.tileShape.draw(
      this.ctx,
      this.tiles,
      this.tileAnimationState.grid,
      this.level,
      this.action,
      this.hoveredTile
    );

    // Hook for subclasses to draw overlays
    this.drawOverlays();
  }


  // Start animation loop if there are animations
  startAnimationLoopIfNeeded(): void {
    if (!this.animationRunning && this.hasAnimations()) {
      this.animationRunning = true;
      requestAnimationFrame(() => this.drawCanvas());
    }
  }

  // Check if there are any animations running (without updating them)
  hasAnimations(): boolean {
    // Check if state exists
    if (!this.tileAnimationState) {
      return false;
    }

    // Check for additional animations from subclasses
    if (this.hasAdditionalAnimations()) {
      return true;
    }

    // Check tile animations
    let hasTileAnimations = false;
    this.tileAnimationState.forEach(tileState => {
      if (tileState.transitionState < 1) {
        hasTileAnimations = true;
      }
    });

    if (hasTileAnimations) {
      return true;
    }

    return false;
  }

  // Simple animation system - returns true if any animations are still running
  updateCanvasAnimations(timestamp: number): boolean {
    if (!this.tileAnimationState) {
      return false;
    }

    let hasAnimations = false;

    // Update additional animations from subclasses
    if (this.updateAdditionalAnimations(timestamp)) {
      hasAnimations = true;
    }

    // Update tile animations
    this.tileAnimationState.forEach(tileState => {
      // Update inset state (selection) - inset squares should appear when selected
      if (tileState.selected) {
        tileState.insetState = 1;
      } else {
        tileState.insetState = 0;
      }

      // Update transition state (flip animation)
      if (tileState.transitionState < 1) {
        hasAnimations = true;
        // Animate over 300ms
        const deltaTime = timestamp - this.lastUpdateTimestamp;
        tileState.transitionState = Math.min(
          1,
          tileState.transitionState + deltaTime / 300
        );
      }
    });

    this.lastUpdateTimestamp = timestamp;
    return hasAnimations;
  }

  drawCanvas(): void {
    if (!this.hidden && this.tiles && this.tileAnimationState && this.level) {
      const timestamp = performance.now();

      // Update animations
      const hasAnimations = this.updateCanvasAnimations(timestamp);

      // Always draw the current state
      this.actuallyDrawCanvas();

      // Only continue animation loop if there are actual animations
      if (hasAnimations) {
        requestAnimationFrame(() => this.drawCanvas());
      } else {
        this.animationRunning = false;
      }
    } else {
      this.animationRunning = false;
    }
  }

  specificOnShow(): void {
    // Override in subclasses if needed
  }

  onShow(): void {
    this.hidden = false;
    document.body.style.zoom = "100%";

    this.specificOnShow();
    this.onResize();
    this.draw();
  }

  onHide(): void {
    this.hidden = true;
  }

  forceRedraw(): void {
    // Force an immediate redraw regardless of animation state
    if (this.level && this.tiles && this.tileAnimationState) {
      this.actuallyDrawCanvas();
    }
  }

  printFlat(): void {
    assert(this.tiles !== null);
    let ret = "";
    ret += this.tiles.width;
    ret += " ";
    ret += this.tiles.height;
    ret += "\n";
    for (let j = 0; j < this.tiles.height; j++) {
      for (let i = 0; i < this.tiles.width; i++) {
        ret += "" + (this.tiles.get(i, j) - 1);
      }
      ret += "\n";
    }
    // Print a textual representation of the level to the console
    console.log(ret);
  }

  printJson(): void {
    const json = ensureNotNull(this.level).toJsonObject();
    delete json.index;
    console.log(JSON.stringify(json));
  }

  printJsonWithoutSolution(): void {
    const json = ensureNotNull(this.level).toJsonObject();
    delete json.solutions;
    delete json.solutionType;
    delete json.par;
    delete json.index;
    console.log(JSON.stringify(json));
  }

  // Hook for subclasses to implement game-specific logic after a move
  postMove(): void {
    // Override in subclasses if needed
  }

  // Action method - must be implemented by subclasses
  // This specifies what happens when you activate squares (e.g., do you unsquare or go the other way)
  abstract action: (v: number) => number;

  // Hook for subclasses to implement game-specific logic on mouse down
  onMouseDown(): void {
    // Override in subclasses if needed
  }

  // Hook for subclasses to implement game-specific logic before a move is applied
  preMove(move: Move): void {
    // Override in subclasses if needed
  }

  // Hook for subclasses to add additional state to undo
  abstract getAdditionalState(): any;

  // Hook for subclasses to restore additional state from undo
  abstract restoreAdditionalState(additionalState: any): void;

  // Save state for undo. move can be a move object, null (for non-move operations),
  // or "restart" (for restart operations). Additional state is saved via getAdditionalState() hook.
  saveUndoState(move: Move | "restart" | "other"): void {
    assert(this.tiles !== null);
    const undo = {
      tiles: this.tiles.clone(),
      move: move,
      additionalState: this.getAdditionalState(),
    };
    this.undoList.push(undo);
  }

  // Apply a move to the board
  applyMove(move: Move, action: (v: number) => number): void {
    assert(this.level !== null);
    assert(this.tiles !== null);

    // Apply the move
    this.level.tileShape.forTilesInMoveSet(this.tiles, move, action);
  }

  // Undo the last move
  undo(): boolean {
    const undo = this.undoList.pop();
    if (!undo) {
      return false;
    } 
    const { tiles:previousTiles, move:undoMove, additionalState:additionalState } = undo;
    this.tiles = previousTiles;

    const isRestart = undoMove === "restart";
    // Handle restart operations differently
    if (isRestart) {
      // For restart, we just restore the state without animation
      this.restoreAdditionalState(additionalState);
    } else if (undoMove !== "other") {
      // For regular moves, animate the reverse
      // Reset all tileStates to default state first
      assert(this.tileAnimationState !== null);
      this.tileAnimationState.reset();
      
      // Debug: check if undo.move exists
      if (undoMove) {
        assert(this.level !== null);
        assert(this.tileAnimationState !== null);
        this.level.tileShape.forTilesInMove(
          this.tileAnimationState.grid,
          undoMove,
          function (ts) {
            ts.transitionState = 0;
          }
        );
      } else {
        // If no move, just reset all tiles to trigger animation
        this.tileAnimationState.forEach(function (ts) {
          ts.transitionState = 0;
        });
      }
      // Update timestamp for animation system
      this.lastUpdateTimestamp = performance.now();
      // Restore additional state from subclasses
      this.restoreAdditionalState(undo.additionalState);
    }
    this.draw();
    this.startAnimationLoopIfNeeded();
    return true;
  }

  // Hook for subclasses to check for additional animations beyond tile animations
  hasAdditionalAnimations() {
    return false;
  }

  // Hook for subclasses to update additional animations
  updateAdditionalAnimations(timestamp: number): boolean {
    return false;
  }

  // Hook for subclasses to draw overlays after base canvas drawing
  drawOverlays() {
    // Override in subclasses if needed
  }

  // Hook for subclasses to display level-specific GUI
  displayLevelGui(level: Level): void {
    // Override in subclasses if needed
  }
}
