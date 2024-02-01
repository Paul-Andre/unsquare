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
    //canvasVirtualSize = Math.min(window.innerWidth, window.innerHeight, 500);
    canvasVirtualSize = Math.min(this.div.offsetWidth, this.div.offsetHeight, 500);

     // var text = "w.iw " + window.innerWidth + " s.w " + screen.width +" d.iw "+this.div.offsetWidth;
    // document.getElementById("Debugger").innerText = text;
    
    canvasSize = canvasVirtualSize * (window.devicePixelRatio || 1);
    canvas.width = canvas.height = canvasSize;
    canvas.style.width = canvas.style.height = canvasVirtualSize + "px";
    this.draw();
  };

  game.displayLevelGui = function(){};

  // This is central to both editor and game
  game.openLevel = function (level) {

    this.gameState = new GameState(level);
    this.level = level;

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


  let currentLevelId = this.level.index;


  let oldSum = vector_sum(this.level.solutionVector);

  console.log(this.gameState.runningSolution);

  //TODO (not sure if it's an add or a subtract) (but it's the same thing mod 2)
  let newSolution = vector_add(this.level.solutionVector, this.gameState.runningSolution);
  vector_simplify_arithmetic(newSolution, level_get_arithmetic(this.level));
  let newSum = vector_sum(newSolution)

  if (newSum < oldSum) {
    this.level.solutionVector = newSolution;
    this.level.solutionType = "manual";
    save_editor_book(current_book);
    
  }


  if (bests[currentLevelId] === null || bests[currentLevelId] === undefined || bests[currentLevelId] > this.gameState.numMoves) {
    bests[currentLevelId] = this.gameState.numMoves;
    saveBests();
  } 

  this.displayLevelGui(this.level);
  this.updateGui();

};

game.getCurrentBest = function() {
  if (this.level) {
    return bests[this.level.index];
  }
  return null;
}

game.displayLevelGui = function(level) {

  var a = this.div.getElementsByClassName("finishedLevel")[0];
  console.log(a)
  a.style.display = "none";

  document.getElementById("TextShower").innerText = level.text;
  let par = vector_sum(level.solutionVector);
  //if (level.solutionType == "gaussian" || level.solutionType == "mixed")

  this.div.getElementsByClassName("parContent")[0].innerText = par

    // + " "+level.solutionType;
  ;

};

game.undo = function () {
  this.gameState.undo();
  this.draw();
};


game.onResize();
console.log(game);









let bookUrl = "2023_sept_5.json";

//https://stackoverflow.com/a/35294675
let request = new XMLHttpRequest();
request.open("GET", bookUrl, true);

var levels;
var bests = [null];

var bests_lsk = bookUrl + "_bests";

function saveBests() {
  localStorage.setItem(bests_lsk, JSON.stringify(bests));
}

function asdf(a,b) {
  return a;
}

// Some really weird bug made me place this here instead of a different file
// TODO: ????
// https://stackoverflow.com/a/52171480
// function cyrb53(str, seed = 0){
function cyrb53(str, seed){
  let h1 = 0xdeadbeef ^ seed,
    h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};


request.onload = function () {
  if (request.status >= 200 && request.status < 400) {
    // Success!


    let data = JSON.parse(request.responseText, book_reviver);


    // let patch_pars = [1,2,2,2,3,4,3,4,3,3,4,3,2,3,4,4,6,5,5,3,3,4,5,5,6,5,13,13,8,6,5,12,9];
    // console.log(patch_pars);
    // for (let i=0; i<patch_pars.length; i++) {
    //   data.levels[i].par = Math.min(data.levels[i].par, patch_pars[i]);
    // }

    // console.log(data)
    // console.log(JSON.stringify(data))


    // alert(data)
    current_book = data;

    // Ok... kinda weird and stupid, but... eh...
    var hash = cyrb53( request.responseText, 0);


    if (localStorage.getItem(bookUrl+"_levels_hash") == hash && localStorage.getItem(bests_lsk)) {
      bests = JSON.parse(localStorage.getItem(bests_lsk));
    } else {
      localStorage.setItem(bookUrl+"_levels_hash", hash);
      bests = Array(data.levels.length).fill(null);
      saveBests();
    }

    game.draw();

  } 
};

request.onerror = function (e) {

};

request.send();




game.openLevel(Level.fromJsonObject(
  {
    "colorScheme": "BW",
    "tileShape": "square",
    // "tiles": [
    //   [1, 1, 1, 1, 1, 1],
    //   [1, 2, 2, 2, 2, 1],
    //   [1, 2, 2, 2, 2, 1],
    //   [1, 2, 2, 2, 2, 1],
    //   [1, 2, 2, 2, 2, 1],
    //   [1, 1, 1, 1, 1, 1]
    // ],
    "tiles": [
      [1, 1, 1, 1 ],
      [1, 2, 2, 1 ],
      [1, 2, 2, 1 ],
      [1, 1, 1, 1 ],
      
    ],
    "par": 1,
    "index": 0,
    // "text": "Pull from one corner of the black square to the other.",

  }
), function(){},

);



// let undo_stack = [];

// function pop_undo_stack() {


// }


//game.onShow();
//


function nextLevel() {
  let level = game.level;
  let index = level.index;
  let levels = current_book.levels;
  console.log(level, index, levels);

  if (index+1 <levels.length) {
    index+=1
    var nextLevel = levels[index];

     // = nextLevel;
    game.openLevel(nextLevel, function(){});

    game.onShow();

    document.getElementById("LevelIndicator").innerText = "Level " + (1+ index);

  }
}


function prevLevel() {
  let level = game.level;
  let index = level.index;
  let levels = current_book.levels;
  console.log(level, index, levels);

  if (index-1 >=0) {
    index-=1
    var nextLevel = levels[index];

    current_level = nextLevel;
    game.openLevel(nextLevel, function(){});

    game.onShow();

    document.getElementById("LevelIndicator").innerText = "Level " + (1+ index);

  }
}


