"use strict";



/// This is what does the basics of drawing the tiles to the screen.
///
function makeGameBase2(canvasId, divId) {
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

  game.div = document.getElementById(divId);

  var canvasVirtualSize;
  var canvasSize;

  game.onResize = function () {
    //console.log(document.body.offsetWidth, document.body.offsetHeight);
    //canvasVirtualSize = Math.min(window.innerWidth, window.innerHeight, MAX_WIDTH);
    canvasVirtualSize = Math.min(this.div.offsetWidth, this.div.offsetHeight, MAX_WIDTH);

     // var text = "w.iw " + window.innerWidth + " s.w " + screen.width +" d.iw "+this.div.offsetWidth;
    // document.getElementById("Debugger").innerText = text;
    
    canvasSize = canvasVirtualSize * (window.devicePixelRatio || 1);
    canvas.width = canvas.height = canvasSize;
    canvas.style.width = canvas.style.height = canvasVirtualSize + "px";
    this.draw();
  };

  game.displayLevelGui = function(){};

  // This is central to both editor and game
  game.openLevel = function (level, book) {

    this.gameState = new GameState(level);
    this.level = level;
    this.book = book;

    mouseStart.pressed = false;

    this.displayLevelGui(level);

  };

  // TODO: remove glitch
  //

  game.doMouseDown = function (x, y) {
    mouseStart.x = x / canvasSize;
    mouseStart.y = y / canvasSize;
    mouseStart.pressed = true;


    // One of the rare things that it might make sense to overwrite?
    var a = game.div.getElementsByClassName("finishedLevel")[0];
    // console.log(a)
    a.style.display = "none";

  };


  game.doMouseMove = function (x, y) {
    mouseNow.x = x / canvasSize;
    mouseNow.y = y / canvasSize;
    // var text = "move " + mouseNow.x + " " + mouseNow.y;
    //document.getElementById("Debugger").innerText = text;


    if (mouseStart.pressed) {
      var potentialMove = this.level.tileShape.moveFromMousePositions(
        mouseStart.x,
        mouseStart.y,
        x / canvasSize,
        y / canvasSize,
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

      var different = false;
      this.gameState.tileStates.forEach(function (v) {
        if (v.selected != v.oldSelected) {
          different = true;
        }
      })

      if (different) {
        if (navigator.vibrate) {
          navigator.vibrate(2);
        }
      }
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
        this.gameState.applyMove(move, this.action);
        this.gameState.tileStates.forEach(function (v) {
          v.selected = false;
          v.transitionState = 0;
        });
        if (navigator.vibrate) {
          navigator.vibrate(3);
        }
      }
      game.draw()
      if (game.isFinished()) {
        game.finishedLevel()
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

  if (false) {
    function createTouchListener(fn) {
      return function (event) {
        if (event.changedTouches) {
          var coords = getCoordinates(event.changedTouches[0]);
          fn(coords.x, coords.y);
        }
        //return cancelEvent(event);
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


    /*
https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture#javascript
*/
    // TODO: eh? Does this actually work on enough modern browsers?
    //

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

  // TODO: Make this not use CPU all the time
  //
  //
  var hidden = true;
  // to make sure we don't requestAnimationFrame if it's already been requested

  var numRequested = 0;

  game.updateGui = function () {

    if (game.isFinished()) {
      var a = this.div.getElementsByClassName("finishedLevel")[0];
      a.style.display = "block";
      if (game.level.index >= game.book.levels.length-1) {
        // TODO: won game.

      }
    }

    if (this.gameState){

      var a = this.div.getElementsByClassName("movesContent")[0]
      a.innerText = this.gameState.numMoves;
    }

    var a = this.div.getElementsByClassName("bestContent")[0]
    var b = game.getCurrentBest();

    if (b===null || b===undefined) {
      a.innerText = "-";
    }else {
      a.innerText = b;
    }
  }

  game.draw = function() {
    game.updateGui();
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
                v.transitionState + (timeStamp - previousTimestamp) / 10
              );
              v.transitionState = 1;
            } else {
              v.transitionState = Math.max(
                0,
                v.transitionState - (timeStamp - previousTimestamp) / 10
              );
              v.transitionState = 0;
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
    document.body.style.zoom = '100%';
    this.draw();
    this.onResize();
  };

  game.onHide = function () {
    hidden = true;
  };

  return game;

}

var game = makeGameBase2("gameCanvas", "game");

screenManager.additionalFunctions.game = game;

// this specifies what happens when you activate squares
game.action = function (v) {
  return game.level.colorScheme.unsquare(v);
};

game.restart = function restart() {
  game.openLevel(this.level, this.book);
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
  let oldSum = vector_sum(this.level.solutionVector);

  console.log(this.gameState.runningSolution);

  //TODO (not sure if it's an add or a subtract) (but it's the same thing mod 2)
  let newSolution = vector_add(this.level.solutionVector, this.gameState.runningSolution);
  vector_simplify_arithmetic(newSolution, level_get_arithmetic(this.level));
  let newSum = vector_sum(newSolution)

  // TODO: this is some somewhat fragile code that tries to integrate with the editor...
  if (newSum < oldSum) {
    this.level.solutionVector = newSolution;
    this.level.solutionType = "manual";
    save_editor_book(this.book);
  }

  let prevBest = getBestNumMoves(this.level);

  let numMoves = this.gameState.numMoves

  if (prevBest === null || numMoves < prevBest){
    setBestNumMoves(this.level, numMoves);
  } 

  this.displayLevelGui(this.level);
  this.updateGui();

};

game.getCurrentBest = function() {
  if (this.level) {
    return getBestNumMoves(this.level);
  }
  return null;
}

game.displayLevelGui = function(level) {

  var a = this.div.getElementsByClassName("finishedLevel")[0];
  a.style.display = "none";

  document.getElementById("TextShower").innerText = level.text;
  let par = vector_sum(level.solutionVector);
  //if (level.solutionType == "gaussian" || level.solutionType == "mixed")

  this.div.getElementsByClassName("parContent")[0].innerText = par

  let index = level.index;

  // TODO: properly do this, with this.div or whatever
  document.getElementById("LevelIndicator").innerText = "Level " + (1+ index);
    // + " "+level.solutionType;
  ;
  
  let states = calculateStates(this.book);

  {
    let prevButton = this.div.querySelector("#prevButton");
    let prevIndex = index-1;
    if (prevIndex < 0 || states[prevIndex]<2) {
      prevButton.setAttribute("disabled", "disabled");
    } else {
      prevButton.removeAttribute("disabled");
    }
  }

  {
    let nextButton = this.div.querySelector("#nextButton");
    let nextIndex = index+1;
    if (nextIndex < 0 || states[nextIndex]<2) {
      nextButton.setAttribute("disabled", "disabled");
    } else {
      nextButton.removeAttribute("disabled");
    }
  }

  

};

game.undo = function () {
  this.gameState.undo();
  this.draw();
};


//TODO: "encapsulate" these two functions in the game "class"
//
function nextLevel() {
  let level = game.level;
  let index = level.index;
  let levels = game.book.levels;

  if (index+1 <levels.length) {
    index+=1
    var nextLevel = levels[index];

     // = nextLevel;
    game.openLevel(nextLevel, game.book);

    game.onShow();
  }
}
function prevLevel() {
  let level = game.level;
  let index = level.index;
  let levels = game.book.levels;

  if (index-1 >=0) {
    index-=1
    var nextLevel = levels[index];

    game.openLevel(nextLevel, game.book);

    game.onShow();
  }
}


