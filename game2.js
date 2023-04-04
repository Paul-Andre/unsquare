"use strict";



/// This is what does the basics of drawing the tiles to the screen.
///
function makeGameBase2(canvasId, divId) {
  var globalDiv = document.getElementById(divId);
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
    gameState: null,
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
  game.openLevel = function (level, saveCallback) {

    this.gameState = new GameState(level);
    this.level = level;

    mouseStart.pressed = false;
    this.saveCallback = saveCallback;

    var a = globalDiv.getElementsByClassName("finishedLevel")[0];
    console.log(a)
    a.style.display = "none";

  };

  // TODO: remove glitch
  //
  /*
   *
   *
function beginSliding(e) {
  slider.onpointermove = slide;
  slider.setPointerCapture(e.pointerId);
}

function stopSliding(e) {
  slider.onpointermove = null;
  slider.releasePointerCapture(e.pointerId);
}

function slide(e) {
  slider.style.transform = `translate(${e.clientX - 70}px)`;
}

const slider = document.getElementById("slider");

slider.onpointerdown = beginSliding;
slider.onpointerup = stopSliding;

*/

  game.doMouseDown = function (x, y) {
    mouseStart.x = x / canvasSize;
    mouseStart.y = y / canvasSize;
    mouseStart.pressed = true;

    var a = globalDiv.getElementsByClassName("finishedLevel")[0];
    console.log(a)
    a.style.display = "none";

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
        this.gameState.tileStates
      );

      this.gameState.tileStates.forEach(function (v) {
        v.selected = false;
      });

      this.level.tileShape.forTilesInMove(
        this.gameState.tileStates,
        potentialMove,
        function (v) {
          v.selected = true;
        }
      );
      game.drawCanvas()
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
        this.gameState.tileStates
      );

      if (move !== null) {
        console.log("asdf")
        console.log(this.action)
        console.log(this)
        this.gameState.applyMove(move, this.action);
        this.gameState.tileStates.forEach(function (v) {
          v.selected = false;
          v.transitionState = 0;
        });
      }
      game.draw()
    }
  };

  game.undo = function () {
    this.gameState.undo();
    this.draw();
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

  // TODO: Make this not use CPU all the time
  //
  //
  var hidden = true;
  // to make sure we don't requestAnimationFrame if it's already been requested

  var numRequested = 0;

  game.draw = function() {

    if (this.gameState){
      console.log(globalDiv)

      var a = globalDiv.getElementsByClassName("movesContent")[0]
      console.log(a)
      a.innerText = this.gameState.numMoves;
    }

    if (game.isFinished()) {
      console.log("Yay");
      game.finishedLevel()
    }
    game.drawCanvas();
  }


  game.drawCanvas = function () {

    if (!hidden && this.gameState) {

      this.level.tileShape.draw(ctx, this.gameState, this.action);

      if (numRequested == 0) {

        requestAnimationFrame(function (timeStamp) {

          numRequested--;
          var previousTimestamp = game.gameState.lastUpdateTimestamp;

          var changed = false;
          
          game.gameState.tileStates.forEach(function (v) {

            var prevTS = v.transitionState;

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

            if (v.transitionState != prevTS){
              changed = true;
            }

          });
          game.gameState.lastUpdateTimestamp = timeStamp;
          if (changed) {
            game.drawCanvas();
          }
        });

        numRequested++;
      }
    }
  };

  game.onShow = function () {
    hidden = false;
    game.draw();
  };

  game.onHide = function () {
    hidden = true;
  };



  // this specifies what happens when you activate squares
  game.action = function (v) {
    return game.level.colorScheme.unsquare(v);
  };

  game.restart = function restart() {
    game.openLevel(this.level);
    game.draw();
  };

  game.isFinished = function() {
    if (this.gameState) {
      var finished = true;
      this.gameState.tiles.forEach(function (v) {
        if (v != 1) {
          finished = false;
        }
      });
      return finished;
    }
    return false;
  }

  game.finishedLevel = function () {
    console.log("adfadsfdsaddddddddddddddddddddddddddddddddd")

    var a = globalDiv.getElementsByClassName("finishedLevel")[0];
    console.log(a)
    a.style.display = "block";


    /*
    var clicked = false;

    if (this.level.best == 0 || this.moves < this.level.best) {
      this.level.best = this.moves;
      dataManager.saveBookBests(this.level.book);
    }

    var par = false;

    var nextLevel;

    if (this.moves <= this.level.par) {
      nextLevel = this.level.book.updateState(this.level, 2);
      par = true;
    } else {
      nextLevel = this.level.book.updateState(this.level, 1);
    }

    var that = this;
    if (typeof this.level.index == "number") {
      canvas.onmousedown = canvas.ontouchstart = function (evt) {
        game.openLevel(nextLevel);
        return cancelEvent(evt);
      };
    }
    */

  };

  game.onResize();
  console.log(game);
  return game;

}



let bookUrl = "niceLevels.json";

//https://stackoverflow.com/a/35294675
let request = new XMLHttpRequest();
request.open("GET", bookUrl, true);

var levels;

request.onload = function () {
  if (request.status >= 200 && request.status < 400) {
    // Success!
    let data = JSON.parse(request.responseText);
    levels = data.levels;
  } 
};

request.onerror = function () {};

request.send();


var game = makeGameBase2("gameCanvas", "game");
screenManager.additionalFunctions.game = game;

var currentLevelId = 0;

game.openLevel(Level.fromJsonObject(
  {
            "colorScheme": "BW",
              "tileShape": "square",
              "tiles": [
                            [1, 1, 1, 1, 1, 1],
                            [1, 2, 2, 2, 2, 1],
                            [1, 2, 2, 2, 2, 1],
                            [1, 2, 2, 2, 2, 1],
                            [1, 2, 2, 2, 2, 1],
                            [1, 1, 1, 1, 1, 1]
                        ],
              "par": 1,
              "solution": [{
                            "x": 1,
                            "y": 1,
                            "size": 4
                        }]
        }
), function(){},

);
game.onShow();

function nextLevel() {
  if (currentLevelId+1 < levels.length) {
    currentLevelId+=1
    var nextLevel = levels[currentLevelId];
    game.openLevel(Level.fromJsonObject(nextLevel), function(){});
game.onShow();
    document.getElementById("LevelIndicator").innerText = "Level " + (1+ currentLevelId);
  }
}

function prevLevel() {
  if (currentLevelId-1 >= 0) {
    currentLevelId-=1;
    var nextLevel = levels[currentLevelId];
    game.openLevel(Level.fromJsonObject(nextLevel), function(){});
game.onShow();
    document.getElementById("LevelIndicator").innerText = "Level " + (1+ currentLevelId);
  }
}


