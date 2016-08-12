"use strict";

/// This is what does the basics of drawing the tiles to the screen.
///
function makeGameBase(canvasId, divId) {

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

	game.onResize = function(){
		//console.log(document.body.offsetWidth, document.body.offsetHeight);
		canvasVirtualSize = Math.min(window.innerWidth, window.innerHeight, 500);
		canvasSize = canvasVirtualSize*(window.devicePixelRatio || 1);
		canvas.width = canvas.height = canvasSize;
		canvas.style.width = canvas.style.height = canvasVirtualSize + "px";
		this.draw();
	}



	// This is central to both editor and game
	game.openLevel = function(level) {

		this.gameState = new GameState(level);
		this.level = level;

		mouseStart.pressed = false;
		levelStats.open(level); // this will only happen in the actual game
	}


	// These should be in the base file
	game.doMouseDown = function(x, y) {
		mouseStart.x = x / canvasVirtualSize;
		mouseStart.y = y / canvasVirtualSize;
		mouseStart.pressed = true;
	};


	game.doMouseMove = function(x, y) {
		mouseNow.x = x / canvasVirtualSize;
		mouseNow.y = y / canvasVirtualSize;
		this.level.shape(mouseStart.x, mouseStart.y, mouseNow.x, mouseNow.y,
				this.gameState.tileStates);
	};


	game.doMouseUp = function(x, y) {
		mouseStart.pressed = false;
	};



	var requestedRedraw = false;
	game.requestRedraw = function() {
		var that = this;
		if (!requestedRedraw) {
			requestAnimationFrame(function() {
				that.draw(ctx);
				requestedRedraw = false
			});
			requestedRedraw = true;
		}
	}




	// Gets the coordinates of the touch/mouse relative to the canvas element.
	//http://www.jacklmoore.com/notes/mouse-position/
	function getCoordinates(event) {
		var style = window.getComputedStyle(canvas, null);
		var borderLeftWidth = parseInt(style.borderLeftWidth, 10);
		var borderTopWidth = parseInt(style.borderTopWidth, 10);
		var rect = canvas.getBoundingClientRect();
		return {
			x: Math.max(0, Math.min(canvas.width - 2, (event.clientX - rect.left - borderLeftWidth)
						*(window.devicePixelRatio || 1))),
			y: Math.max(0, Math.min(canvas.height - 2, (event.clientY - rect.top - borderTopWidth)
						*(window.devicePixelRatio || 1))),
		};
	}

	function createTouchListener(fn) {
		return function(event){
			if (event.targetTouches) {
				var coords = getCoordinates(event.targetTouches[0]);
				fn(coords.x, coords.y);
			}
			return cancelEvent(event);
		};
	}

	canvas.ontouchstart = createTouchListener(game.doMouseDown.bind(game));
	canvas.ontouchmove = createTouchListener(game.doMouseMove.bind(game));
	canvas.ontouchend = createTouchListener(game.doMouseDown.bind(game));

	function createMouseListener(fn) {
		return function(event) {
			var coords = getCoordinates(event);
			fn(coords.x, coords.y);
			return cancelEvent(event);
		};
	}

	canvas.onmousedown = createTouchListener(game.doMouseDown.bind(game));
	canvas.onmousemove = createTouchListener(game.doMouseMove.bind(game));
	canvas.onmouseup = createTouchListener(game.doMouseDown.bind(game));

	window.addEventListener("resize", function(){
		game.onResize()
	}, false);
	

	var hidden = true;
	game.draw = function(){
		if(!hidden && this.gameState){
			this.level.shape.draw(ctx,this.gameState,
					this.level.colorScheme.unsquare);
			requestAnimationFrame(function(){
				game.draw();
			});
		}
	};

	game.onShow = function(){
		hidden = false;
		this.draw();
	};

	game.onHide = function(){
		hidden = true;
	};


	game.onResize();
	return game;
}

