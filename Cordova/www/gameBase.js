"use strict";

/// This is what does the basics of drawing the tiles to the screen.
///
function makeGameBase(canvasId, divId /*unused*/ ) {

  var canvas = document.getElementById(canvasId);
  var ctx = canvas.getContext("2d");

  var mouseStart = {
    x: 0,
    y: 0,
    pressed: false
  }

  var mouseNow = {
    x: 0,
    y: 0
  };


  var game = {
    gameState: null,
  }

  var canvasVirtualSize;
  var canvasSize;

  game.onResize = function() {
    //console.log(document.body.offsetWidth, document.body.offsetHeight);
    canvasVirtualSize = Math.min(window.innerWidth, window.innerHeight, 500);
    canvasSize = canvasVirtualSize * (window.devicePixelRatio || 1);
    canvas.width = canvas.height = canvasSize;
    canvas.style.width = canvas.style.height = canvasVirtualSize + "px";
    this.draw();
  }



  // This is central to both editor and game
  game.openLevel = function(level) {

    this.gameState = new GameState(level);
    this.level = level;

    mouseStart.pressed = false;
  }


  // These should be in the base file
  game.doMouseDown = function(x, y) {
    mouseStart.x = x / canvasSize;
    mouseStart.y = y / canvasSize;
    mouseStart.pressed = true;
  };


  game.doMouseMove = function(x, y) {
    mouseNow.x = x / canvasSize;
    mouseNow.y = y / canvasSize;



    if (mouseStart.pressed) {
      var potentialMove =
        this.level.tileShape.moveFromMousePositions(mouseStart.x,
          mouseStart.y, x / canvasSize, y / canvasSize,
          this.gameState.tileStates);

      this.gameState.tileStates.forEach(function(v) {
        v.selected = false;
      });

      this.level.tileShape.forTilesInMove(this.gameState.tileStates, potentialMove, function(v) {
        v.selected = true;
      });


    }
  };


  game.doMouseUp = function(x, y) {
    if (mouseStart.pressed) {
      mouseStart.pressed = false;
      var move =
        this.level.tileShape.moveFromMousePositions(mouseStart.x,
          mouseStart.y, x / canvasSize, y / canvasSize,
          this.gameState.tileStates);

      if (move !== null) {
        this.gameState.applyMove(move, this.action);
        this.gameState.tileStates.forEach(function(v) {
          v.selected = false;
          v.transitionState = 0;
        });
      }
    }
  };


  game.undo = function() {
    this.gameState.undo();
  }



  // Gets the coordinates of the touch/mouse relative to the canvas element.
  //http://www.jacklmoore.com/notes/mouse-position/
  function getCoordinates(event) {
    var style = window.getComputedStyle(canvas, null);
    var borderLeftWidth = parseInt(style.borderLeftWidth, 10);
    var borderTopWidth = parseInt(style.borderTopWidth, 10);
    var rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(canvas.width - 2, (event.clientX - rect.left - borderLeftWidth) *
        (window.devicePixelRatio || 1))),
      y: Math.max(0, Math.min(canvas.height - 2, (event.clientY - rect.top - borderTopWidth) *
        (window.devicePixelRatio || 1))),
    };
  }

  function createTouchListener(fn) {
    return function(event) {
      if (event.changedTouches) {
        var coords = getCoordinates(event.changedTouches[0]);
        console.log(coords);
        fn(coords.x, coords.y);
      }
      return cancelEvent(event);
    };
  }

  canvas.addEventListener("touchstart", createTouchListener(game.doMouseDown.bind(game)));
  canvas.addEventListener("touchmove", createTouchListener(game.doMouseMove.bind(game)));
  canvas.addEventListener("touchend", createTouchListener(game.doMouseUp.bind(game)));

  function createMouseListener(fn) {
    return function(event) {
      var coords = getCoordinates(event);
      fn(coords.x, coords.y);
      return cancelEvent(event);
    };
  }

  canvas.addEventListener("mousedown", createMouseListener(game.doMouseDown.bind(game)));
  canvas.addEventListener("mousemove", createMouseListener(game.doMouseMove.bind(game)));
  canvas.addEventListener("mouseup", createMouseListener(game.doMouseUp.bind(game)));

  window.addEventListener("resize", function() {
    game.onResize()
  }, false);


  var hidden = true;
  game.draw = function() {
    if (!hidden && this.gameState) {

      requestAnimationFrame(function(timeStamp) {
        var previousTimestamp = game.gameState.lastUpdateTimestamp;
        game.gameState.tileStates.forEach(function(v) {
          if (v.selected) {
            v.transitionState = Math.min(1,
              v.transitionState + (timeStamp - previousTimestamp) / 100);
          } else {
            v.transitionState = Math.max(0,
              v.transitionState - (timeStamp - previousTimestamp) / 100);
          }
        });
        game.gameState.lastUpdateTimestamp = timeStamp;
        game.draw();
      });


      this.level.tileShape.draw(ctx, this.gameState, this.action);

    }
  };

  game.onShow = function() {
    hidden = false;
    this.draw();
  };

  game.onHide = function() {
    hidden = true;
  };


  game.onResize();
  return game;
}