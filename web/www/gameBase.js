"use strict";

/// This is what does the basics of drawing the tiles to the screen.
///
class GameBase {
  constructor(canvasId, divId /*unused*/) {
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

    this.canvasVirtualSize = 0;
    this.canvasSize = 0;

    // TODO: eh?
    this.hidden = true;
    // to make sure we don't requestAnimationFrame if it's already been requested
    this.numRequested = 0;

    this.setupEventListeners();
    this.onResize();
  }

  onResize() {
    //console.log(document.body.offsetWidth, document.body.offsetHeight);
    //this.canvasVirtualSize = Math.min(window.innerWidth, window.innerHeight, MAX_WIDTH);
    this.canvasVirtualSize = Math.min(this.div.offsetWidth, this.div.offsetHeight, MAX_WIDTH);

    this.canvasSize = this.canvasVirtualSize * (window.devicePixelRatio || 1);
    this.canvas.width = this.canvas.height = this.canvasSize;
    this.canvas.style.width = this.canvas.style.height = this.canvasVirtualSize + "px";
    this.draw();
  }

  // This should probably be renamed to openLevel, and the other openLevel be
  // renamed to resetComponent or something
  initializeTiles(level, book) {
    let tiles = level.tiles;

    this.level = level;
    this.book = book;

    this.tiles = tiles.clone();

    const tileStates = tiles.clone();
    tileStates.forEachSet(function () {
      return {
        selected: false,
        oldSelected: false,
        insetState: 0,
      };
    });

    this.tileStates = tileStates;

    this.operations = compute_operations_for_level(this.level);
    this.inverseOperations = new Map();
    for (let i = 0; i < this.operations.length; i++) {
      this.inverseOperations.set(this.operations[i].join(""), i);
    }
    assert(level.solutionVector);

    this.runningSolution = level.solutionVector.slice();

    this.arithmetic = level.colorScheme.arithmetic;

    this.updateGui();
  }

  displayLevelGui() {}

  openLevel(level, book) {
    this.undoList = [];

    this.initializeTiles(level, book);

    this.lastUpdateTimestamp = performance.now();
    this.numMoves = 0;

    this.mouseStart.pressed = false;

    this.displayLevelGui(level);
  }

  // These should be in the base file
  doMouseDown(x, y) {
    this.mouseStart.x = x / this.canvasSize;
    this.mouseStart.y = y / this.canvasSize;
    this.mouseStart.pressed = true;
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
        this.tileStates
      );

      this.tileStates.forEach(function (v) {
        v.oldSelected = v.selected;
        v.selected = false;
      });

      this.level.tileShape.forTilesInMove(
        this.tileStates,
        potentialMove,
        function (v) {
          v.selected = true;
        }
      );

      let different = false;
      this.tileStates.forEach(function (v) {
        if (v.selected != v.oldSelected) {
          different = true;
        }
      });

      if (different) {
        if (navigator.vibrate) {
          navigator.vibrate(2);
        }
      }
      //this.drawCanvas()
      this.draw();
    }
  }

  // This is meant to be overwritten
  createUndoState(move) {
    return {
      tiles: this.tiles.clone(),
      runningSolution: this.runningSolution.slice(),
      solutionType: this.solutionType,
      move: move,
    };
  }

  // This is also meant to be overwritten
  restoreUndoState(undo) {
    this.initializeTiles(undo.tiles, undo.runningSolution, undo.solutionType);
    this.runningSolution = undo.runningSolution;
    this.numMoves -= 1;
  }

  saveStateForUndo(move = null) {
    this.undoList.push(this.createUndoState(move));
  }

  updateGui() {}
  postApplyMove() {}

  applyMove(move, action) {
    if (move != null) {
      this.saveStateForUndo(move);

      this.level.tileShape.forTilesInMoveSet(this.tiles, move, action);
      let vector = this.level.tileShape.moveToVector(this.tiles, move);
      let opIndex = this.inverseOperations.get(vector.join(""));
      // console.log(vector);
      // console.log(opIndex);
      if (this.runningSolution) {
        this.runningSolution[opIndex] += 1;
        vector_simplify_arithmetic(this.runningSolution, this.arithmetic);
      }
      this.postApplyMove(move, action);
    }
    this.numMoves += 1;
    this.updateGui();
  }

  undo() {
    if (this.undoList.length > 0) {
      const undo = this.undoList.pop();
      this.restoreUndoState(undo);
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
        this.tileStates
      );

      if (move !== null) {
        this.applyMove(move, this.action);
        this.tileStates.forEach(function (v) {
          v.selected = false;
          v.insetState = 0;
        });
      }
      if (navigator.vibrate) {
        navigator.vibrate(3);
      }
      this.draw();
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
            console.log(coords);
            fn(coords.x, coords.y);
          }
          return cancelEvent(event);
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

  // The idea is that a 
  drawCanvasContinuous() {}

  draw() {
    if (!this.hidden && this.tiles) {
      this.level.tileShape.draw_expanded(this.ctx, this.tiles, this.tileStates, this.level.colorScheme, this.action);

      if (this.numRequested == 0) {
        requestAnimationFrame((timeStamp) => {
          this.numRequested--;

          const previousTimestamp = this.lastUpdateTimestamp;
          this.tileStates.forEach(function (v) {
            if (v.selected) {
              v.insetState = Math.min(
                1,
                v.insetState + (timeStamp - previousTimestamp) / 100
              );
            } else {
              v.insetState = Math.max(
                0,
                v.insetState - (timeStamp - previousTimestamp) / 100
              );
            }
          });
          this.lastUpdateTimestamp = timeStamp;
          this.draw();
        });
        this.numRequested++;
      }
    }
  }

  specificOnShow() {}

  onShow() {
    this.hidden = false;
    document.body.style.zoom = '100%';
    this.draw();
    this.onResize();
    this.specificOnShow();
  }

  onHide() {
    this.hidden = true;
  }
}

// Factory function for backward compatibility
function makeGameBase(canvasId, divId) {
  return new GameBase(canvasId, divId);
}
