"use strict";

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

	var helperCanvas = document.createElement("canvas")
	var helperCtx = helperCanvas.getContext("2d");
	var canvasSize = 480;

	canvas.width = canvas.height = canvasSize;

	var size = 0;

	var game = {
		grid: null,
		pregrid: null,
		level: null,
		undoList: [],
		finished: false,
	};

	helperCanvas.width = canvas.width;
	helperCanvas.height = canvas.height;

	game.isSkippable = function() {
		return this.level.index+1<this.level.book.levels.length && this.level.book.levels[this.level.index+1].state>=0;
	}

	game.loadLevel = function(level) {
		this.level = level;

		this.grid = Grid.from2dArray(level.map);
		this.preGrid = Grid.empty(this.grid.width, this.grid.height);


		if (typeof level.text == "string") {
			document.getElementById("TextShower").innerHTML = level.text;
		} else {
			document.getElementById("TextShower").innerHTML = "&zwnj;";
		}

		document.getElementById("LevelIndicator").innerHTML = "Level " + level.index;

		document.getElementById("ParIndicator").innerHTML = "Par: " + level.par;

		document.getElementById("MovesIndicator").innerHTML = "Moves: " + 0;

		document.getElementById("BestIndicator").innerHTML = "Best: " + ((level.best == 0) ? "-" : level.best);

		if (this.isSkippable()) {
			document.getElementById("skipButton").disabled = false;
		}
		else {
			document.getElementById("skipButton").disabled = true;
		}

		mouseStart.pressed = false;
		this.disactivateEvents();
		var that = this;
		this.swap(function() {
			that.initEventListeners()
		});
		this.moves = 0;
		this.undoList.length = 0;


		levelStats.open(level);

	}

	game.swap = function(callback) {
		var initialTime = Date.now();
		var that = this;
		helperCtx.drawImage(canvas, 0, 0);
		canvas.width = canvasSize;
		canvas.height = canvasSize;

		// This is used to draw the grid that gets translated
		function update() {

			var time = Date.now() - initialTime;
			if (time > 300) {
				game.draw(ctx)
					callback();
				helperCanvas.width = canvas.width;
				helperCanvas.height = canvas.height;
			} else {
				ctx.save();
				ctx.translate(canvas.width * (1 - time / 300), 0)
					ctx.drawImage(helperCanvas, -canvas.width, 0);
				game.draw(ctx);
				ctx.restore();
				requestAnimationFrame(update);
			}
		}
		update();
	}


	game.isClear = function isClear() {
		var clear = true;

		this.grid.forEach(function(v) {

			if (v != 1) {
				clear = false;
			}

		});

		return clear;
	}


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

	/// Given fractional positions the two corners of the dragged rectangle relative to the grid,
	/// returns the top right corner and size of square to be inverted.
	/// Output is in the form of {x: int, y: int, size: int}
	/// You still need to check if the "size" of the output is bigger than 1.
	function calculateSquare(x1, y1, x2, y2) {

		// Specify the direction in which the square goes. 1 is the default value.
		var xSign = Math.sign(x2 - x1) || 1;
		var ySign = Math.sign(y2 - y1) || 1;

		// Get the starting cell.
		var x = Math.floor(x1);
		var y = Math.floor(y1);

		// The size of the square
		var size = Math.max(Math.abs(Math.floor(x2) - x), Math.abs(Math.floor(y2) - y)) + 1;

		// Adjustments if the square goes in negative directions
		if (xSign == -1) {
			x+=1;
		}
		if (ySign == -1) {
			y+=1;
		}

		// Making sure that the square doesn't exit the screen.
		if (x + size*xSign < 0) {
			size = x;
		}
		else if (x + size*xSign >= game.grid.width) {
			size = game.grid.width-x;
		}

		if (y + size*ySign < 0) {
			size = y;
		}
		else if (y + size*ySign >= game.grid.height) {
			size = game.grid.height-y;
		}

		// Return a square with x,y representing the top left corner.
		return {
			x: Math.min(x, x+size*xSign),
			y: Math.min(y, y+size*ySign),
			size: size,
		}
	}


	game.updatePreGrid = function(x1, y1, x2, y2) {

		var invertingSquare = calculateSquare(x1, y1, x2, y2);

		var that = this;

		this.preGrid.setAll(0);
		if (invertingSquare.size > 1) {
			this.preGrid.window(invertingSquare.x, invertingSquare.y, invertingSquare.size, invertingSquare.size)
				.forEachSet(function(value, x, y) {
					return(that.level.color.unsquare(that.grid.get(x + invertingSquare.x, y + invertingSquare.y)));
				}) ;
		}

	}

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

	game.undo = function() {
		if (this.undoList.length > 0) {
			var undo = this.undoList.pop();
			this.grid = undo;
			this.draw(ctx);
			this.moves--;
			document.getElementById("MovesIndicator").innerHTML = "Moves: " + this.moves;
			if (this.finished) {
				this.finished = false;
				this.initEventListeners();
			}
		}
	}

	game.draw = function(ctx) {

		var that = this;

		ctx.fillStyle = "#999999";
		ctx.fillRect(0,0,canvas.width, canvas.height);

		this.grid.forEach(function(value, x, y) {

			var padding = size*0.1;
			if (that.level.color.cells[value]) {
				ctx.fillStyle = that.level.color.cells[value].fill;
				ctx.fillRect(
						(x * size + padding*0.5),
						(y * size + padding*0.5),
						( size-padding),
						(size-padding)
						);
			}
		});


		this.preGrid.forEach(function(value, x, y) {

			if (that.level.color.cells[value]) {
				ctx.fillStyle = that.level.color.cells[value].fill;
				ctx.strokeStyle = that.level.color.cells[value].stroke;

				var smallSquareSize = Math.floor(size * 0.6 * 0.5) * 2;
				ctx.fillRect((x + 0.5) * size - 0.5 * smallSquareSize, (y + 0.5) * size - 0.5 * smallSquareSize, smallSquareSize, smallSquareSize);
			}
		});

		ctx.fillStyle = "red";
		ctx.fillRect(mouseNow.x, mouseNow.y, 1, 1);
	}


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

	game.restart = function restart() {
		levelStats.close(this.level);
		game.loadLevel(this.level);
		game.draw(ctx);
	}


	game.finishedLevel = function() {
		this.finished = true;

		var initialTime = Date.now();
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



		function draw() {
			var time = Date.now() - initialTime;
			if (!clicked) {
				if (time > 150) {
					game.draw(ctx)

						drawCheck(ctx, canvas.width / 440);
				} else {
					game.draw(ctx)
						ctx.save()
						ctx.globalAlpha = time / 150

						drawCheck(ctx, canvas.width / 440);
					ctx.restore();
					requestAnimationFrame(draw);
				}
			}
		}

		draw();

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

	game.onResize = function(){
		//console.log(document.body.offsetWidth, document.body.offsetHeight);
		canvasSize = Math.min(480, document.body.offsetWidth, document.body.offsetHeight);
		canvas.width = canvas.height = canvasSize;
		size = canvasSize / this.grid.width;
		this.draw(ctx);
	}

	function onResize(){
		game.onResize();
	}



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
				x: Math.max(0, Math.min(canvas.width - 2, event.clientX - rect.left - borderLeftWidth)),
				y: Math.max(0, Math.min(canvas.height - 2, event.clientY - rect.top - borderTopWidth)),
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

	game.disactivateEvents = function() {

		canvas.ontouchstart = canvas.onmousedown = null;
		canvas.ontouchend = canvas.onmouseup = null;
		canvas.ontouchmove = canvas.onmousemove = null;
		window.removeEventListener("resize", onResize);
	}


	game.hide = function() {

		document.getElementById(divId).style.display = "none";
		game.disactivateEvents();

		adManager.hide();

		(game.level) && (levelStats.close(this.level));
	}

	game.show = function() {

		document.getElementById(divId).style.display = "";
		onResize();
		game.initEventListeners();
		adManager.show();
		setTimeout(function() {
			adManager.reposition();
		}, 30);
	}

	game.clearScreen = function() {
		canvas.width = canvas.width;
		helperCanvas.width = helperCanvas.width;
	}

	game.displayTutorial = function() {
		document.getElementById(divId).style.display = "none";
		//show the tutorial such that the back button returns to the game
		tutorial.display(function() {
			document.getElementById(divId).style.display = "";
		});
	}

	game.skip = function(){
		if(this.isSkippable()){
			this.loadLevel(this.level.book.levels[this.level.index+1]);
		}
	}

	return game;
}

var game = makeGame("gameCanvas", "gameDiv");
