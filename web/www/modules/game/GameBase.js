"use strict";

import { GameState } from '../core/GameState.js';
import { trackLevelStart } from '../utils/analytics.js';
import { MAX_WIDTH } from '../utils/config.js';
import { cancelEvent } from '../utils/helpers.js';

/// This is what does the basics of drawing the tiles to the screen.
///
export class GameBase {
  constructor(canvasId, divId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");
    this.div = document.getElementById(divId);

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

    this.gameState = null;
    // TODO: encapsulate these in an object
    this.demoDrag = null;
    this.demoDragTime = 0;

    this.canvasVirtualSize = 0;
    this.canvasSize = 0;

    // TODO: Make this not use CPU all the time
    this.hidden = true;
    // to make sure we don't requestAnimationFrame if it's already been requested
    // Animation system properties

    this.firstDemoDrag = {
      start: {
        x: 0.3,
        y: 0.3,
      },
      end: {
        x: 0.7,
        y: 0.7,
      },
    };

    this.wasPaused = true;
    this.animationRunning = false;

    this.setupEventListeners();
    this.onResize();
  }

  onResize() {
    this.canvasVirtualSize = Math.min(
      this.div.offsetWidth,
      this.div.offsetHeight,
      MAX_WIDTH
    );

    this.canvasSize = this.canvasVirtualSize * (window.devicePixelRatio || 1);
    this.canvas.width = this.canvas.height = this.canvasSize;
    this.canvas.style.width = this.canvas.style.height =
      this.canvasVirtualSize + "px";
    this.draw();
  }

  displayLevelGui() {}

  openLevel(level, book) {
    this.gameState = new GameState(level);
    this.level = level;
    this.book = book;

    trackLevelStart(level, book);

    this.mouseStart.pressed = false;

    this.displayLevelGui(level);
  }

  // TODO: remove glitch
  doMouseDown(x, y) {
    this.mouseStart.x = x / this.canvasSize;
    this.mouseStart.y = y / this.canvasSize;
    this.mouseStart.pressed = true;

    // Immediately select the tile under the mouse cursor
    this.level.tileShape.select(
      this.mouseStart.x,
      this.mouseStart.y,
      this.mouseStart.x,
      this.mouseStart.y,
      this.gameState.tileStates
    );

    // Update inset states for immediate selection
    this.gameState.tileStates.forEach(function (v) {
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

  doMouseMove(x, y) {
    this.mouseNow.x = x / this.canvasSize;
    this.mouseNow.y = y / this.canvasSize;

    if (this.mouseStart.pressed) {
      // Use the select method which properly handles single tile selection
      this.level.tileShape.select(
        this.mouseStart.x,
        this.mouseStart.y,
        x / this.canvasSize,
        y / this.canvasSize,
        this.gameState.tileStates
      );

      // Check if selection changed and redraw if needed
      let different = false;
      this.gameState.tileStates.forEach(function (v) {
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

  doMouseUp(x, y) {
    if (this.mouseStart.pressed) {
      this.mouseStart.pressed = false;
      const move = this.level.tileShape.moveFromMousePositions(
        this.mouseStart.x,
        this.mouseStart.y,
        x / this.canvasSize,
        y / this.canvasSize,
        this.gameState.tileStates
      );

      if (move !== null) {
        // Hook for subclasses to save state before move
        this.preMove(move);

        this.gameState.applyMove(move, this.action);
        this.gameState.tileStates.forEach(function (v) {
          v.selected = false;
          v.insetState = 0;
          // v.transitionState = 0;
        });
        this.level.tileShape.forTilesInMove(
          this.gameState.tileStates,
          move,
          function (v) {
            v.transitionState = 0;
          }
        );

        // Update timestamp when starting animations to prevent huge delta time
        this.gameState.lastUpdateTimestamp = performance.now();

        if (navigator.vibrate) {
          navigator.vibrate(3);
        }
      } else {
        // Clear selection for invalid moves (like single tile selection)
        this.gameState.tileStates.forEach(function (v) {
          v.selected = false;
        });
      }
      this.draw();
      // Start animation loop if animations were triggered
      this.startAnimationLoopIfNeeded();
      // Game-specific logic moved to subclasses
      this.postMove();
    }
  }

  // Handle mouse hover events
  handleMouseEnter(event) {
    // Mouse entered canvas
  }

  handleMouseLeave(event) {
    // Mouse left canvas - clear hover state
    this.hoveredTile = null;
    this.forceRedraw();
  }

  handleMouseMove(event) {
    if (!this.mouseStart.pressed) {
      // Only handle hover when not dragging
      const coords = this.getCoordinates(event);
      const x = coords.x / this.canvasSize;
      const y = coords.y / this.canvasSize;

      // Convert to tile coordinates
      const tileX = Math.floor(x * this.gameState.tiles.width);
      const tileY = Math.floor(y * this.gameState.tiles.height);

      // Check if coordinates are within bounds
      if (
        tileX >= 0 &&
        tileX < this.gameState.tiles.width &&
        tileY >= 0 &&
        tileY < this.gameState.tiles.height
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
  getCoordinates(event) {
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
    if (false) {
      const createTouchListener = fn => {
        return event => {
          if (event.changedTouches) {
            const coords = this.getCoordinates(event.changedTouches[0]);
            fn(coords.x, coords.y);
          }
          //return cancelEvent(event);
        };
      };

      this.canvas.addEventListener(
        "touchstart",
        createTouchListener(this.doMouseDown.bind(this))
      );
      this.canvas.addEventListener(
        "touchmove",
        createTouchListener(this.doMouseMove.bind(this))
      );
      this.canvas.addEventListener(
        "touchend",
        createTouchListener(this.doMouseUp.bind(this))
      );

      const createMouseListener = fn => {
        return event => {
          const coords = this.getCoordinates(event);
          fn(coords.x, coords.y);
          return cancelEvent(event);
        };
      };

      this.canvas.addEventListener(
        "mousedown",
        createMouseListener(this.doMouseDown.bind(this))
      );
      this.canvas.addEventListener(
        "mousemove",
        createMouseListener(this.doMouseMove.bind(this))
      );
      this.canvas.addEventListener(
        "mouseup",
        createMouseListener(this.doMouseUp.bind(this))
      );
    } else {
      const beginSliding = e => {
        console.log("begin", e);
        const coords = this.getCoordinates(e);
        this.doMouseDown(coords.x, coords.y);
        return cancelEvent(event);
      };

      const slide = e => {
        // console.log("slide", e)
        const coords = this.getCoordinates(e);
        this.doMouseMove(coords.x, coords.y);
        return cancelEvent(event);
      };

      const stopSliding = e => {
        console.log("asdfasd");
        const coords = this.getCoordinates(e);
        this.doMouseUp(coords.x, coords.y);
        return cancelEvent(event);
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
    }

    window.addEventListener(
      "resize",
      () => {
        this.onResize();
      },
      false
    );
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

    // TODO: this should probably not be in the base
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

    if (this.isFinished()) {
      if (this.isInBasicBook()) {
        if (this.level.index >= this.book.levels.length - 1) {
          // TODO: won game.
          const a = this.div.getElementsByClassName("finishedGame")[0];
          a.style.display = "block";
        } else {
          const a = this.div.getElementsByClassName("finishedLevel")[0];
          a.style.display = "block";
        }
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

  draw() {
    this.updateGui();
    if (this.level && this.gameState) {
      // Update inset states before drawing
      this.gameState.tileStates.forEach(tileState => {
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

  // TODO: This is probably an intermediate step in refactor
  actuallyDrawCanvas() {
    this.level.tileShape.draw(
      this.ctx,
      this.gameState,
      this.action,
      this.hoveredTile
    );

    if (this.demoDrag) {
      this.overlayDemoDrag();
    }
  }

  // Force a single redraw without starting animation loop
  forceRedraw() {
    if (!this.hidden && this.gameState && this.level) {
      // Update inset states before drawing
      this.gameState.tileStates.forEach(tileState => {
        if (tileState.selected) {
          tileState.insetState = 1;
        } else {
          tileState.insetState = 0;
        }
      });
      this.actuallyDrawCanvas();
    }
  }

  // Start animation loop if there are animations
  startAnimationLoopIfNeeded() {
    if (!this.animationRunning && this.hasAnimations()) {
      this.animationRunning = true;
      requestAnimationFrame(() => this.drawCanvas());
    }
  }

  // Check if there are any animations running (without updating them)
  hasAnimations() {
    // Check if gameState exists
    if (!this.gameState || !this.gameState.tileStates) {
      return false;
    }

    // Check demo drag animation
    if (this.demoDrag) {
      return true;
    }

    // Check tile animations
    let hasTileAnimations = false;
    this.gameState.tileStates.forEach(tileState => {
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
  updateCanvasAnimations(timestamp) {
    let hasAnimations = false;

    // Update demo drag animation
    if (this.demoDrag) {
      hasAnimations = true;
      this.demoDragTime +=
        (timestamp - this.gameState.lastUpdateTimestamp) / 1000; // 1 second cycle
      this.demoDragTime %= 1;
    }

    // Update tile animations
    this.gameState.tileStates.forEach(tileState => {
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
        const deltaTime = timestamp - this.gameState.lastUpdateTimestamp;
        tileState.transitionState = Math.min(
          1,
          tileState.transitionState + deltaTime / 300
        );
      }
    });

    this.gameState.lastUpdateTimestamp = timestamp;
    return hasAnimations;
  }

  drawCanvas() {
    if (!this.hidden && this.gameState && this.level) {
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

  // TODO put these in a better file
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

  // TODO: overlay this on a separate canvas for efficiency?  eh...
  overlayDemoDrag() {
    if (!this.demoDrag) {
      return;
    }
    let width = this.canvas.width;
    let height = this.canvas.height;

    // TODO: maybe include this in the demoDrag object?
    let relativeDragSize = 40 / MAX_WIDTH;
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
    //let easedTime = animTime; //bezierBlend(animTime);
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

  onShow() {
    this.hidden = false;
    document.body.style.zoom = "100%";
    this.onResize();
    // Force a redraw after resize
    this.draw();
  }

  onHide() {
    this.hidden = true;
  }

  forceRedraw() {
    // Force an immediate redraw regardless of animation state
    if (this.level && this.gameState) {
      this.actuallyDrawCanvas();
    }
  }

  // Hook for subclasses to implement game-specific logic after a move
  postMove() {
    // Override in subclasses
  }

  // Hook for subclasses to implement game-specific logic on mouse down
  onMouseDown() {
    // Override in subclasses
  }

  // Hook for subclasses to save state before a move is applied
  preMove(move) {
    // Override in subclasses
  }
}
