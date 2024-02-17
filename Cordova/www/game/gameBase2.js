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
    // TODO: encapsulate these in an object
    demoDrag: null,
    demoDragTime: 0,
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


  var firstDemoDrag = {
    start: {
      x: 0.3,
      y: 0.3,
    },
    end: {
      x: 0.7,
      y: 0.7,
    }
  }

  game.openLevel = function (level, book) {

    this.gameState = new GameState(level);
    this.level = level;
    this.book = book;

    trackLevelStart(level, book);


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

    // TODO: this should probably not be in the base
    if (game.level.id == "level_1693531796434" && this.gameState.numMoves == 0) {
      game.demoDrag = firstDemoDrag;
    } else {
      game.demoDrag = null;
    }

    let suggestsRestart = false;
    if (game.level.id == "level_1693531796434" && this.gameState.numMoves >= 1 && !game.isFinished()) {
      suggestsRestart = true;
    }
    if (game.level.index<10 && this.gameState.numMoves > this.level.par*2) {
      suggestsRestart = true;
    }

    let restartButton = this.div.getElementsByClassName("restart_button")[0];
    if (suggestsRestart) {
      restartButton.classList.add("in_yo_face");
    } else {
      restartButton.classList.remove("in_yo_face");
    }



    if (game.isFinished()) {
      if (game.level.index >= game.book.levels.length-1) {
        // TODO: won game.
        var a = this.div.getElementsByClassName("finishedGame")[0];
        a.style.display = "block";
      } else {
        var a = this.div.getElementsByClassName("finishedLevel")[0];
        a.style.display = "block";
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

      if (this.demoDrag) {
        this.overlayDemoDrag();
      }

      if (numRequested == 0) {

        requestAnimationFrame(function (timeStamp) {

          numRequested--;
          var previousTimestamp = game.gameState.lastUpdateTimestamp;

          var changed = false;
          if (game.demoDrag) {
            //TODO: make it so this doesn't use so much CPU
            changed = true;
            game.demoDragTime += (timeStamp - previousTimestamp)/2000;
            game.demoDragTime %= 1;
          }
          
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

  // TODO put these in a better file
  function interpolate(a,b,t) {
    return a + (b-a)*t;
  }

  // [0,1] -> [0,1]
  // https://stackoverflow.com/a/25730573/2356347
  function bezierBlend(t){
      return t * t * (3.0 - 2.0 * t);
  }

  ctx.strokeStyle = "#4fb6ff55";
  //function cubic
  
  function clamp(x) {
    return Math.min(1, Math.max(0, x));
  }

  function easeOut(x) {
    return interpolate(

    interpolate(x,
      1,x 
      ), 1, x);
  }

  function dragBlend(x) {
    return interpolate(

    interpolate(
    interpolate(

      bezierBlend(x),

      1,x ),
      1,x ),
      
      1, x);
  }

  // TODO: overlay this on a separate canvas for efficiency?  eh...
  game.overlayDemoDrag = function () {
    if (!game.demoDrag) {
      return;
    }
    let width = canvas.width;
    let height = canvas.height;

    // TODO: maybe include this in the demoDrag object?
    let relativeDragSize = 40/MAX_WIDTH;
    let relativeLineSize = relativeDragSize*0.75;

    // TODO: figure out whether to use width or height. Only issue when rectangles
    ctx.lineWidth = relativeLineSize * width;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#4fb6ff55";
    ctx.beginPath()
    ctx.moveTo(game.demoDrag.start.x * width, game.demoDrag.start.y * height);
    ctx.lineTo(game.demoDrag.end.x *width, game.demoDrag.end.y *height);
    ctx.stroke();

    // TODO: the ease-out should actually be related to the size of the grid ideally
    let animTime = game.demoDragTime;
    //let easedTime = animTime; //bezierBlend(animTime);
    let easedTime = dragBlend(animTime);
    let bubbleX = interpolate(game.demoDrag.start.x, game.demoDrag.end.x, easedTime) * width;
    let bubbleY = interpolate(game.demoDrag.start.y, game.demoDrag.end.y, easedTime) * height;

    let bubbleSize = relativeDragSize * width;
    ctx.fillStyle = "#4fb6ff55";
    ctx.beginPath();
    ctx.arc(bubbleX, bubbleY, bubbleSize, 0, 2 * Math.PI);
    ctx.fill();

  }

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
