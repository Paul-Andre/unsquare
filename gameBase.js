"use strict";



/// This is what does the basics of drawing the tiles to the screen.
///
function makeGameBase(canvasId, divId /*unused*/)  {

  // produceGameState = produceGameState || function(level) {
  //   return new GameState(level);
  // }

  var canvas = document.getElementById(canvasId);
  var ctx = canvas.getContext("2d");

  var mouseStart = {
    x: 0,
    y: 0,
    pressed: false,
  };

  var mouseNow = {
    x: 0,
    y: 0,
  };

  var game = {


  };

  game.div = document.getElementById(divId);

  var canvasVirtualSize;
  var canvasSize;

  game.onResize = function () {
    //console.log(document.body.offsetWidth, document.body.offsetHeight);
    //canvasVirtualSize = Math.min(window.innerWidth, window.innerHeight, MAX_WIDTH);
    canvasVirtualSize = Math.min(this.div.offsetWidth, this.div.offsetHeight, MAX_WIDTH);

    canvasSize = canvasVirtualSize * (window.devicePixelRatio || 1);
    canvas.width = canvas.height = canvasSize;
    canvas.style.width = canvas.style.height = canvasVirtualSize + "px";
    this.draw();
  };

  // This should probably be renamed to openLevel, and the other openLevel be
  // renamed to resetComponent or something
  game.initializeTiles = function(level ) {
    let tiles = level.tiles;

    this.level = level;

    this.tiles = tiles.clone();

    var tileStates = tiles.clone();
    tileStates.forEachSet(function () {
      return {
        selected: false,
        oldSelected: false,
        transitionState: 0,
      };
    });

    this.tileStates = tileStates;

    this.operations = compute_operations_for_level(this.level);
    this.inverseOperations = new Map();
    for (let i=0; i<this.operations.length; i++) {
      this.inverseOperations.set(this.operations[i].join(""), i);
    }
    assert(level.solutionVector);

    this.runningSolution = level.solutionVector.slice();

    this.arithmetic = level.colorScheme.arithmetic;

    this.updateGui();
  }

  game.displayLevelGui = function(){};
  

  game.openLevel = function (level) {

    this.undoList = [];

    this.initializeTiles(level);

    this.lastUpdateTimestamp = performance.now();
    this.numMoves = 0;

    mouseStart.pressed = false;

    this.displayLevelGui(level);
  };

  // These should be in the base file
  game.doMouseDown = function (x, y) {
    mouseStart.x = x / canvasSize;
    mouseStart.y = y / canvasSize;
    mouseStart.pressed = true;
  };

  game.doMouseMove = function (x, y) {
    mouseNow.x = x / canvasSize;
    mouseNow.y = y / canvasSize;

    if (mouseStart.pressed) {
      var potentialMove = this.level.tileShape.moveFromMousePositions(
        mouseStart.x,
        mouseStart.y,
        x / canvasSize,
        y / canvasSize,
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


      var different = false;
      this.tileStates.forEach(function (v) {
        if (v.selected != v.oldSelected) {
          different = true;
        }
      })

      if (different) {
        if (navigator.vibrate) {
          navigator.vibrate(2);
        }
      }
      //game.drawCanvas()
      game.draw()


    }
  };


  // This is meant to be overwritten
  game.createUndoState = function(move) {
      return {
        tiles: this.tiles.clone(),
        runningSolution: this.runningSolution.slice(),
        solutionType: this.solutionType,
        move: move,
      }
  }

  // This is also meant to be overwritten
  game.restoreUndoState = function(undo) {
    this.initializeTiles(undo.tiles, undo.runningSolution, undo.solutionType);
    this.runningSolution = undo.runningSolution
    this.numMoves-=1;
  }

  game.saveStateForUndo = function(move=null) {
      this.undoList.push(game.createUndoState(move));
  }

  game.updateGui = function () { }
  game.postApplyMove = function() { }

  game.applyMove = function (move, action) {
    if (move != null) {
      this.saveStateForUndo(move);

      this.level.tileShape.forTilesInMoveSet(this.tiles, move, action);
      let vector = this.level.tileShape.moveToVector(this.tiles, move)
      let opIndex = this.inverseOperations.get(vector.join(""));
      // console.log(vector);
      // console.log(opIndex);
      if (this.runningSolution) {
        this.runningSolution[opIndex] += 1;
        vector_simplify_arithmetic(this.runningSolution, this.arithmetic);
      }
      game.postApplyMove(move, action);

    }
    this.numMoves+=1;
    this.updateGui();
  };

  game.undo = function () {
    if (this.undoList.length > 0) {
      var undo = this.undoList.pop();
      this.restoreUndoState(undo);
    }
  };

  game.doMouseUp = function (x, y) {
    if (mouseStart.pressed) {
      mouseStart.pressed = false;
      var move = this.level.tileShape.moveFromMousePositions(
        mouseStart.x,
        mouseStart.y,
        x / canvasSize,
        y / canvasSize,
        this.tileStates
      );

      if (move !== null) {
        this.applyMove(move, this.action);
        this.tileStates.forEach(function (v) {
          v.selected = false;
          v.transitionState = 0;
        });
      }
      if (navigator.vibrate) {
        navigator.vibrate(3);
      }
      game.draw();
    }
  };


  // Gets the coordinates of the touch/mouse relative to the canvas element.
  //http://www.jacklmoore.com/notes/mouse-position/
  function getCoordinates(event) {
    var style = window.getComputedStyle(canvas, null);
    var borderLeftWidth = parseInt(style.borderLeftWidth, 10);
    var borderTopWidth = parseInt(style.borderTopWidth, 10);
    var rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(
        0,
        Math.min(
          canvas.width - 2,
          (event.clientX - rect.left - borderLeftWidth) *
            (window.devicePixelRatio || 1)
        )
      ),
      y: Math.max(
        0,
        Math.min(
          canvas.height - 2,
          (event.clientY - rect.top - borderTopWidth) *
            (window.devicePixelRatio || 1)
        )
      ),
    };
  }

  if (false) {
  function createTouchListener(fn) {
    return function (event) {
      if (event.changedTouches) {
        var coords = getCoordinates(event.changedTouches[0]);
        console.log(coords);
        fn(coords.x, coords.y);
      }
      return cancelEvent(event);
    };
  }

  canvas.addEventListener(
    "touchstart",
    createTouchListener(game.doMouseDown.bind(game))
  );
  canvas.addEventListener(
    "touchmove",
    createTouchListener(game.doMouseMove.bind(game))
  );
  canvas.addEventListener(
    "touchend",
    createTouchListener(game.doMouseUp.bind(game))
  );

  function createMouseListener(fn) {
    return function (event) {
      var coords = getCoordinates(event);
      fn(coords.x, coords.y);
      return cancelEvent(event);
    };
  }

  canvas.addEventListener(
    "mousedown",
    createMouseListener(game.doMouseDown.bind(game))
  );
  canvas.addEventListener(
    "mousemove",
    createMouseListener(game.doMouseMove.bind(game))
  );
  canvas.addEventListener(
    "mouseup",
    createMouseListener(game.doMouseUp.bind(game))
  );
  }else{
    function beginSliding(e) {
      console.log("begin", e)
      var coords = getCoordinates(e);
      game.doMouseDown(coords.x, coords.y);

      //canvas.onpointermove = slide;
      //canvas.setPointerCapture(e.pointerId);


      return cancelEvent(event);
    }

    function slide(e) {
      // console.log("slide", e)
      var coords = getCoordinates(e);
      game.doMouseMove(coords.x, coords.y);

      //canvas.setPointerCapture(e.pointerId);

      return cancelEvent(event);
    }

    function stopSliding(e) {
      console.log("asdfasd")
      var coords = getCoordinates(e);
      game.doMouseUp(coords.x, coords.y);


      //canvas.releasePointerCapture(e.pointerId);
      return cancelEvent(event);

    }

    // canvas.onpointerdown = beginSliding;
    // canvas.onpointermove = slide;
    // canvas.onpointerup = stopSliding;

    canvas.addEventListener(
      "pointerdown",
      beginSliding,
    );

    canvas.addEventListener(
      "pointermove",
      slide,

    );
    canvas.addEventListener(
      "pointerup",
      stopSliding,
    );




  }

  window.addEventListener(
    "resize",
    function () {
      game.onResize();
    },
    false
  );

  // TODO: eh?
  var hidden = true;
  // to make sure we don't requestAnimationFrame if it's already been requested
  var numRequested = 0;

  // The idea is that a 

  game.drawCanvasContinuous = function () {

  }
  
  game.draw = function () {
    if (!hidden && this.tiles) {
      this.level.tileShape.draw_expanded(ctx, this.tiles, this.tileStates, this.level.colorScheme, this.action);

      if (numRequested == 0) {
        requestAnimationFrame(function (timeStamp) {
          numRequested--;

          var previousTimestamp = game.lastUpdateTimestamp;
          game.tileStates.forEach(function (v) {
            if (v.selected) {
              v.transitionState = Math.min(
                1,
                v.transitionState + (timeStamp - previousTimestamp) / 100
              );
            } else {
              v.transitionState = Math.max(
                0,
                v.transitionState - (timeStamp - previousTimestamp) / 100
              );
            }

          });
          game.lastUpdateTimestamp = timeStamp;
          game.draw();
        });
        numRequested++;
      }
    }
  };

  game.onShow = function () {
    hidden = false;
    document.body.style.zoom = '100%';
    this.draw();
    this.onResize();
  };

  game.onHide = function () {
    hidden = true;
  };

  game.onResize();
  return game;
}
