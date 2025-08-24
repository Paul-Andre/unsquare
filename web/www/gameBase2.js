"use strict";

/// This is what does the basics of drawing the tiles to the screen.
///
class GameBase2 {
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

    this.gameState = null;
    // TODO: encapsulate these in an object
    this.demoDrag = null;
    this.demoDragTime = 0;

    this.canvasVirtualSize = 0;
    this.canvasSize = 0;

    // TODO: Make this not use CPU all the time
    this.hidden = true;
    // to make sure we don't requestAnimationFrame if it's already been requested
    this.numRequested = 0;

    this.firstDemoDrag = {
      start: {
        x: 0.3,
        y: 0.3,
      },
      end: {
        x: 0.7,
        y: 0.7,
      }
    };

    this.wasPaused = true;

    this.setupEventListeners();
    this.onResize();
  }

  onResize() {
    this.canvasVirtualSize = Math.min(this.div.offsetWidth, this.div.offsetHeight, MAX_WIDTH);

    this.canvasSize = this.canvasVirtualSize * (window.devicePixelRatio || 1);
    this.canvas.width = this.canvas.height = this.canvasSize;
    this.canvas.style.width = this.canvas.style.height = this.canvasVirtualSize + "px";
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

    // One of the rare things that it might make sense to overwrite?
    const a = this.div.getElementsByClassName("finishedLevel")[0];
    // console.log(a)
    a.style.display = "none";
  }

  doMouseMove(x, y) {
    this.mouseNow.x = x / this.canvasSize;
    this.mouseNow.y = y / this.canvasSize;

    if (this.mouseStart.pressed) {
      const potentialMove = this.level.tileShape.moveFromMousePositions(
        this.mouseStart.x,
        this.mouseStart.y,
        x / this.canvasSize,
        y / this.canvasSize,
        this.gameState.tileStates
      );

      this.gameState.tileStates.forEach(function (v) {
        v.oldSelected = v.selected;
        v.selected = false;
      });

      this.level.tileShape.forTilesInMove(
        this.gameState.tileStates,
        potentialMove,
        function (v) {
          v.selected = true;
        }
      );

      let different = false;
      this.gameState.tileStates.forEach(function (v) {
        if (v.selected != v.oldSelected) {
          different = true;
        }
      });

      if (different) {
        if (navigator.vibrate) {
          navigator.vibrate(2);
        }
      }
      if (different) {
        this.drawCanvas();
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
          });

        if (navigator.vibrate) {
          navigator.vibrate(3);
        }
      }
      this.draw();
      if (this.isFinished()) {
        this.finishedLevel();
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
      const createTouchListener = (fn) => {
        return (event) => {
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

      const createMouseListener = (fn) => {
        return (event) => {
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
      const beginSliding = (e) => {
        console.log("begin", e);
        const coords = this.getCoordinates(e);
        this.doMouseDown(coords.x, coords.y);
        return cancelEvent(event);
      };

      const slide = (e) => {
        // console.log("slide", e)
        const coords = this.getCoordinates(e);
        this.doMouseMove(coords.x, coords.y);
        return cancelEvent(event);
      };

      const stopSliding = (e) => {
        console.log("asdfasd");
        const coords = this.getCoordinates(e);
        this.doMouseUp(coords.x, coords.y);
        return cancelEvent(event);
      };

      this.canvas.addEventListener("pointerdown", beginSliding);
      this.canvas.addEventListener("pointermove", slide);
      this.canvas.addEventListener("pointerup", stopSliding);
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
    if (this.level.id == "level_1693531796434" && this.gameState.numMoves == 0) {
      this.demoDrag = this.firstDemoDrag;
    } else {
      this.demoDrag = null;
    }
    // The logic would be something like:
    // Check if needs to provide hint according to level json
    // Run a basic hint system to get the next move to be hinted, or otherwise to undo
    // If a move to be hinted, calculate the drag based on that move, and set it as this.demoDrag

    let suggestsRestart = false;
    if (this.level.id == "level_1693531796434" && this.gameState.numMoves >= 1 && !this.isFinished()) {
      suggestsRestart = true;
    }
    if (this.isInBasicBook() && this.level.index < 10 && this.gameState.numMoves > this.level.par * 3 && !this.isFinished()) {
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
      this.drawCanvas();
    }
  }

  // TODO: This is probably an intermediate step in refactor
  actuallyDrawCanvas() {
    this.level.tileShape.draw(this.ctx, this.gameState, this.action);

    if (this.demoDrag) {
      this.overlayDemoDrag();
    }
  }

  // Updates the states, doesn't actually draw
  // returns a boolean, whether things have changed
  updateCanvasAnimations(timestamp) {
    const previousTimestamp = this.gameState.lastUpdateTimestamp;

    // TODO: technically, this is unsettled_or_changed,
    // And perhaps it might make sense to return both those variables...
    let unsettled = false;

    if (this.demoDrag) {
      //TODO: make it so this doesn't use so much CPU
      unsettled = true;
      this.demoDragTime += (timestamp - previousTimestamp) / 2000;
      this.demoDragTime %= 1;
    }

    this.gameState.tileStates.forEach((v) => {
      let prevIS = v.insetState;
      let prevTS = v.transitionState;

      if (v.selected) {
        v.insetState = 1;
      } else {
        v.insetState = 0;
      }

      v.transitionState = Math.min(
        1,
        v.transitionState + (timestamp - previousTimestamp) / 200
        // TODO: calculate actually how many milliseconds this uses
      );

      if (v.insetState != prevIS) {
        unsettled = true;
      }
      if (v.transitionState != 1 || v.transitionState != prevTS) {
        unsettled = true;
      }
    });
    this.gameState.lastUpdateTimestamp = timestamp;
    return unsettled;
  }

  drawCanvas() {
    let requested = false;

    if (!this.hidden && this.gameState && this.level) {
      let timestamp = performance.now();
      //TODO: is document.animationTimeline.currentTime better?

      if (this.gameState.lastUpdateTimestamp === timestamp) {
        return;
      }

      if (this.wasPaused) {
        // Hack so that updateCanvasAnimations doesn't calculated a huge timestamp.
        // TODO: perhaps, instead do this in places such as when I change tilestate?
        this.gameState.lastUpdateTimestamp = timestamp;
      }
      let unsettled = this.updateCanvasAnimations(timestamp);
      this.actuallyDrawCanvas();
      if (unsettled) {
        if (this.numRequested == 0) {
          requestAnimationFrame((timestamp) => {
            this.numRequested--;
            this.drawCanvas();
          });
          this.numRequested++;
          requested = true;
        }
      }
    } else {
      console.log("either hidden or gameState isn't there, not drawing");
    }
    this.wasPaused = !requested;
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
    return this.interpolate(
      this.interpolate(x, 1, x), 1, x);
  }

  dragBlend(x) {
    return this.interpolate(
      this.interpolate(
        this.interpolate(
          this.bezierBlend(x),
          1, x), 1, x),
      1, x);
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
    this.ctx.moveTo(this.demoDrag.start.x * width, this.demoDrag.start.y * height);
    this.ctx.lineTo(this.demoDrag.end.x * width, this.demoDrag.end.y * height);
    this.ctx.stroke();

    // TODO: the ease-out should actually be related to the size of the grid ideally
    let animTime = this.demoDragTime;
    //let easedTime = animTime; //bezierBlend(animTime);
    let easedTime = this.dragBlend(animTime);
    let bubbleX = this.interpolate(this.demoDrag.start.x, this.demoDrag.end.x, easedTime) * width;
    let bubbleY = this.interpolate(this.demoDrag.start.y, this.demoDrag.end.y, easedTime) * height;

    let bubbleSize = relativeDragSize * width;
    this.ctx.fillStyle = "#4fb6ff55";
    this.ctx.beginPath();
    this.ctx.arc(bubbleX, bubbleY, bubbleSize, 0, 2 * Math.PI);
    this.ctx.fill();
  }

  onShow() {
    this.hidden = false;
    document.body.style.zoom = '100%';
    this.draw();
    this.onResize();
  }

  onHide() {
    this.hidden = true;
  }
}

// Factory function for backward compatibility
function makeGameBase2(canvasId, divId) {
  return new GameBase2(canvasId, divId);
}
