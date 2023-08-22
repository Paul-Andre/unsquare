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



  var canvasVirtualSize;
  var canvasSize;

  game.onResize = function () {
    //console.log(document.body.offsetWidth, document.body.offsetHeight);
    canvasVirtualSize = Math.min(window.innerWidth, window.innerHeight, 500);
    canvasSize = canvasVirtualSize * (window.devicePixelRatio || 1);
    canvas.width = canvas.height = canvasSize;
    canvas.style.width = canvas.style.height = canvasVirtualSize + "px";
    this.draw();
  };

  // This is central to both editor and game
  game.openLevel = function (level) {


    var tileStates = level.tiles.clone();
    tileStates.forEachSet(function () {
      return {
        selected: false,
        oldSelected: false,
        transitionState: 0,
      };
    });

    this.tiles = level.tiles.clone();
    this.tileStates = tileStates;

    this.undoList = [];

    this.level = level;

    this.lastUpdateTimestamp = performance.now();
    this.numMoves = 0;

    mouseStart.pressed = false;
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
        v.selected = false;
      });

      this.level.tileShape.forTilesInMove(
        this.tileStates,
        potentialMove,
        function (v) {
          v.selected = true;
        }
      );
    }
  };


  game.applyMove = function (move, action) {
    if (move != null) {
      this.undoList.push({
        tiles: this.tiles.clone(),
        move: move,
      });
      this.level.tileShape.forTilesInMoveSet(this.tiles, move, action);
    }
    this.numMoves+=1;
  };

  game.undo = function () {
    if (this.undoList.length > 0) {
      var undo = this.undoList.pop();
      this.tiles = undo.tiles;
      this.numMoves-=1;
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
    this.draw();
  };

  game.onHide = function () {
    hidden = true;
  };

  game.onResize();
  return game;
}
