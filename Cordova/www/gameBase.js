"use strict";

/// This is what does the basics of drawing the tiles to the screen.
///
function makeGame(canvasId, divId) {

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

	// This should be in the base
	var maxCanvasSize = 440;
	var canvasSize = maxCanvasSize;
	var canvasVirtualSize = maxCanvasSize;

	canvas.width = canvas.height = canvasSize;

	var size = 0;

	var game = {
		tiles: null,
		selectedTiles: null,
		transitionStateOfTiles: null,
		level: null,
		undoList: [],
		finished: false,
	};


	// this depends on the book and nothing specific about the level.
	// but this assumes the concept of a book
	game.isSkippable = function() {
		return this.level.index+1<this.level.book.levels.length
		&& this.level.book.levels[this.level.index+1].state>=0;
	}


	// This is central to both editor and game
	game.loadLevel = function(level) {
		this.level = level;

		mouseStart.pressed = false;

		levelStats.open(level); // this will only happen in the actual game
	}



	// this 
	game.isClear = function isClear() {
		var clear = true;

		this.grid.forEach(function(v) {

			if (v != 1) {
				clear = false;
			}

		});

		return clear;
	}



	// These should be in the base file
	game.doMouseDown = function(x, y) {
		mouseStart.x = x;
		mouseStart.y = y;
		mouseStart.pressed = true;
	};


	game.doMouseMove = function(x, y) {
		mouseNow.x = x;
		mouseNow.y = y;
		var size = canvasSize / this.grid.width;
		if (mouseStart.pressed) {
			this.updatePreGrid(mouseStart.x / size, mouseStart.y / size, x / size, y / size);
			this.requestRedraw(ctx);
		}
	};


	game.doMouseUp = function(x, y) {
		mouseStart.pressed = false;
		this.preGrid.setAll(0);
		var size = canvasSize / this.grid.width;
		this.unsquareGrid(mouseStart.x / size, mouseStart.y / size, x / size, y / size);
	};





	// square or base

	game.unsquareGrid = function(x1, y1, x2, y2) {

		var invertingSquare = calculateSquare(x1, y1, x2, y2);
		var x = invertingSquare.x;
		var y = invertingSquare.y;
		var size = invertingSquare.size;

		if (invertingSquare.size > 1) {
			this.undoList.push(this.grid.clone());
			this.grid.window(x,y,size,size).forEachSet(this.level.color.unsquare);
			this.moves++;
			document.getElementById("MovesIndicator").innerHTML = "Moves: " + this.moves;
		}
		this.draw(ctx);

		if(this.isClear()){
			this.finishedLevel();
		}

	}


	// base 
	game.undo = function() {
		if (this.undoList.length > 0) {
			var undo = this.undoList.pop();
			this.grid = undo;
			this.draw(ctx);
			//this.moves--;
			//document.getElementById("MovesIndicator").innerHTML = "Moves: " + this.moves;
			if (this.finished) {
				this.finished = false;
				this.initEventListeners();
			}
		}
	}


	// square
	game.draw = function(ctx) {

		var that = this;

		ctx.fillStyle = "#999999";
		ctx.fillRect(0,0,canvas.width, canvas.height);

		this.grid.forEach(function(value, x, y) {

			var padding = size*0.1;
			if (that.level.type.color.cells[value]) {
				ctx.fillStyle = that.level.type.color.cells[value].fill;
				ctx.fillRect(
						(x * size + padding*0.5),
						(y * size + padding*0.5),
						( size-padding),
						(size-padding)
						);
			}
		});


		this.preGrid.forEach(function(value, x, y) {

			if (that.level.type.color.cells[value]) {
				ctx.fillStyle = that.level.type.color.cells[value].fill;

				var smallSquareSize = Math.floor(size * 0.6 * 0.5) * 2;
				ctx.fillRect((x + 0.5) * size - 0.5 * smallSquareSize, (y + 0.5) * size - 0.5 * smallSquareSize, smallSquareSize, smallSquareSize);
			}
		});

	}


	// base
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


	// specific to game
	game.restart = function restart() {
		levelStats.close(this.level);
		game.loadLevel(this.level);
		game.draw(ctx);
	}


	// someting to 
	game.finishedLevel = function() {
		this.finished = true;

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
		}
		else {
			nextLevel = this.level.book.updateState(this.level, 1);
		}

		var that = this;
		if (typeof this.level.index == "number") {
			game.disactivateEvents();
			canvas.onmousedown = canvas.ontouchstart = function(evt) {
				game.loadLevel(nextLevel);
				return cancelEvent(evt);
			}
		}
		levelStats.pass(this.level);
	}

	// the base definitel
	game.onResize = function(){
		//console.log(document.body.offsetWidth, document.body.offsetHeight);
		canvasVirtualSize = Math.min(maxCanvasSize, document.body.offsetWidth, document.body.offsetHeight);
		canvasSize = canvasVirtualSize*(window.devicePixelRatio || 1);
		canvas.width = canvas.height = canvasSize;
		canvas.style.width = canvas.style.height = canvasVirtualSize + "px";
		size = canvasSize / this.grid.width;
		this.draw(ctx);
	}

	function onResize(){
		game.onResize();
	}



	// base, I guess, if it's really needed
	game.initEventListeners = function() {

		var that = this;

		// Gets the coordinates of the touch/mouse relative to the canvas element.
		//http://www.jacklmoore.com/notes/mouse-position/
		function getCoordinates(event) {
			var style = window.getComputedStyle(canvas, null);
			var borderLeftWidth = parseInt(style.borderLeftWidth, 10);
			var borderTopWidth = parseInt(style.borderTopWidth, 10);
			var rect = canvas.getBoundingClientRect();
			return {
				x: Math.max(0, Math.min(canvas.width - 2, (event.clientX - rect.left - borderLeftWidth)*(window.devicePixelRatio || 1))),
				y: Math.max(0, Math.min(canvas.height - 2, (event.clientY - rect.top - borderTopWidth)*(window.devicePixelRatio || 1))),
			};
		}

		canvas.ontouchstart = function(event) {
			if (event.targetTouches) {
				var coords = getCoordinates(event.targetTouches[0]);
				that.doMouseDown(coords.x, coords.y);
			}
			return cancelEvent(event);
		}

		canvas.ontouchend = function(event) {
			if (event.changedTouches) {
				var coords = getCoordinates(event.changedTouches[0]);
				that.doMouseUp(coords.x, coords.y);
			}
			return cancelEvent(event);
		}

		canvas.ontouchmove = function(event) {
			if (event.changedTouches) {
				var coords = getCoordinates(event.changedTouches[0]);
				that.doMouseMove(coords.x, coords.y);
			}
			return cancelEvent(event);
		}

		canvas.onmousedown = function(event) {
			var coords = getCoordinates(event);
			that.doMouseDown(coords.x, coords.y);
			return cancelEvent(event);
		}

		canvas.onmouseup = function(event) {
			var coords = getCoordinates(event);
			that.doMouseUp(coords.x, coords.y);
			return cancelEvent(event);
		}

		canvas.onmousemove = function(event) {
			var coords = getCoordinates(event);
			that.doMouseMove(coords.x, coords.y);
			return cancelEvent(event);
		}
		
		window.addEventListener("resize", onResize, false);

	}


	// same here, base
	game.disactivateEvents = function() {

		canvas.ontouchstart = canvas.onmousedown = null;
		canvas.ontouchend = canvas.onmouseup = null;
		canvas.ontouchmove = canvas.onmousemove = null;
		window.removeEventListener("resize", onResize);
	}


	// save here, base
	game.onHide = function() {
		game.disactivateEvents();
		adManager.hide();
		//(game.level) && (levelStats.close(this.level));
	}

	// same here, base
	game.onShow = function() {
		//onResize();
		game.initEventListeners();
		adManager.show();
		setTimeout(function() {
			adManager.reposition();
		}, 30);
	}

	// base, but probably not really needed
	game.clearScreen = function() {
		// TODO: do this the correct way
		canvas.width = canvas.width;
	}

	// will be replaced by next and previous buttons, and are special to game.
	game.skip = function(){
		if(this.isSkippable()){
			this.loadLevel(this.level.book.levels[this.level.index+1]);
		}
	}

	return game;
}

var game = makeGame("gameCanvas", "gameScreen");
screenManager.additionalFunctions.gameScreen = game;
