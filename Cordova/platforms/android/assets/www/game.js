function makeGame(canvasId, divId) {
	var canvas = document.getElementById(canvasId);
	var ctx = canvas.getContext("2d");
	var size = 40;

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
	helperCanvas.width = canvas.width;
	helperCanvas.height = canvas.height;

	var game = {
		grid: null,
		pregrid: null,
		data: null,
		book: null,
		color: null,
		undoList: [],
		finished: false,
	};

	game.isSkippable = function() {
		return this.data.index+1<this.book.levels.length && this.book.levels[this.data.index+1].state>=0;
	}

	game.loadLevel = function(data) {
		this.data = data;
		this.book = data.book;

		this.grid = Grid.from2dArray(data.map);
		this.preGrid = Grid.empty(this.grid.width, this.grid.height);


		if (typeof data.text == "string") {
			document.getElementById("TextShower").innerHTML = data.text;
		} else {
			document.getElementById("TextShower").innerHTML = "&zwnj;";
		}

		document.getElementById("LevelIndicator").innerHTML = "Level " + data.index;

		document.getElementById("ParIndicator").innerHTML = "Par: " + data.par;

		document.getElementById("MovesIndicator").innerHTML = "Moves: " + 0;

		document.getElementById("BestIndicator").innerHTML = "Best: " + ((data.best == 0) ? "-" : data.best);

		if (this.isSkippable()) {
			document.getElementById("skipButton").disabled = false;
		}
		else {
			document.getElementById("skipButton").disabled = true;
		}


		this.color = data.color;

		mouseStart.pressed = false;
		this.disactivateEvents();
		var that = this;
		this.swap(function() {
			that.initEventListeners()
		});
		this.moves = 0;
		this.undoList.length = 0;


		levelStats.open(data);

	}

	game.swap = function(callback) {
		var initialTime = Date.now();
		var that = this;
		helperCtx.drawImage(canvas, 0, 0);
		canvas.width = this.grid.width*size;
		canvas.height = this.grid.height*size;

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


	game.checkIfClear = function checkIfClear() {
		var clear = true;

		this.grid.forEach(function(v) {

			if (v != 1) {
				clear = false;
			}

		});

		if(clear){
			this.finishedLevel();
		}

	}


	game.doMouseDown = function(x, y) {
			mouseStart.pressed = true;
	};


	game.doMouseMove = function(x, y) {
		if (mouseStart.pressed) {
			this.updatePreGrid(mouseStart.x / size, mouseStart.y / size, x / size, y / size);
			this.requestRedraw(ctx);
		}
	};



	game.doMouseUp = function(x, y) {
		mouseStart.pressed = false;
		this.preGrid.setAll(0);
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
					//console.log(that.color.unsquare(that.grid.get(x, y)));
					return(that.color.unsquare(that.grid.get(x + invertingSquare.x, y + invertingSquare.y)));

				}) ;
		}

	}

	game.unsquareGrid = function(x1, y1, x2, y2) {

		var invertingSquare = calculateSquare(x1, y1, x2, y2);
		var x = invertingSquare.x;
		var y = invertingSquare.y;
		var w = invertingSquare.size;
		var h = invertingSquare.size;

		if (invertingSquare.size > 1) {
			this.undoList.push(this.grid.clone());
			this.grid.window(x,y,w,h).forEachSet(this.color.unsquare);
			this.moves++;
			document.getElementById("MovesIndicator").innerHTML = "Moves: " + this.moves;
		}
		this.draw(ctx);
		this.checkIfClear();
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
			if (that.color.cells[value]) {
				ctx.fillStyle = that.color.cells[value].fill;
				//ctx.strokeStyle = that.color.cells[value].stroke;
				ctx.fillRect(
					Math.floor(x * size + padding*0.5),
					Math.floor(y * size + padding*0.5),
					Math.floor( size-padding),
					Math.floor(size-padding)
				);
				//ctx.strokeRect(x * size, y * size, size, size);
			}

		});


		this.preGrid.forEach(function(value, x, y) {

			if (that.color.cells[value]) {
				ctx.fillStyle = that.color.cells[value].fill;
				ctx.strokeStyle = that.color.cells[value].stroke;

				var smallSquareSize = Math.floor(size * 0.6 * 0.5) * 2;
				ctx.fillRect((x + 0.5) * size - 0.5 * smallSquareSize, (y + 0.5) * size - 0.5 * smallSquareSize, smallSquareSize, smallSquareSize);
				//	ctx.strokeRect(x*size,y*size,size,size);		
			}



			/*if(value==1){
			ctx.fillStyle="white";
			ctx.fillRect(x*size+5,y*size+5,size-10,size-10);
			ctx.strokeStyle="black";
			ctx.strokeRect(x*size+5,y*size+5,size-10,size-10);
			}
			if(value==2){
			ctx.fillStyle="black";
			ctx.fillRect(x*size+5,y*size+5,size-10,size-10);
			ctx.strokeStyle="white";
			ctx.strokeRect(x*size+5,y*size+5,size-10,size-10);
			}*/

		});

		/*
		if (mouseStart.pressed) {
			ctx.save()
			ctx.strokeStyle = this.color.mouse[0];
			ctx.strokeRect(mouseStart.x, mouseStart.y, mouseNow.x - mouseStart.x, mouseNow.y - mouseStart.y);
			ctx.strokeStyle = this.color.mouse[1];
			ctx.strokeRect(mouseStart.x - 0.5, mouseStart.y - 0.5, mouseNow.x - mouseStart.x, mouseNow.y - mouseStart.y);
			ctx.restore();
		}
		*/
	}


	game.drawGrid = function() {
		this.draw(ctx);
	}

	var requestedRedraw = false;
	game.requestRedraw = function() {
		var that = this;

		if (!requestedRedraw) {
			requestAnimationFrame(function() {
				that.drawGrid();
				requestedRedraw = false
			});
			requestedRedraw = true;
		}

	}

	game.restart = function restart() {
		levelStats.close(this.data);
		game.loadLevel(this.data);
		game.draw(ctx);
	}


	game.finishedLevel = function() {
		this.finished = true;

		var initialTime = Date.now();
		var clicked = false

		if (this.data.best == 0 || this.moves < this.data.best) {

			this.data.best = this.moves;
			dataManager.saveBookBests(this.data.book);

		}

		var par = false;

		if (this.moves <= this.data.par) {

			nextLevel = this.book.updateState(this.data, 2);
			par = true;

		} else {

			nextLevel = this.book.updateState(this.data, 1);

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

		var nextLevel;



		var that = this;
		if (typeof this.data.index == "number") {
			game.disactivateEvents();
			canvas.onmousedown = canvas.ontouchstart = function(evt) {
				game.loadLevel(nextLevel);
				return cancelEvent(evt);
			}
		}

		levelStats.pass(this.data);


	}

	game.initEventListeners = function() {

		var canvasOffset = {
			left: 0,
			top: 0
		};
		var element = canvas;
		while (element) {
			if (typeof element.offsetLeft !== 'undefined') {
				canvasOffset.left += element.offsetLeft;
				canvasOffset.top += element.offsetTop;
			}
			element = element.parentNode;
		}

		var that = this;

		canvas.ontouchstart = function doMouseDown(event) {
			var x, y;
			if (event.targetTouches) {
				x = mouseStart.x = Math.max(0, Math.min(canvas.width - 2, event.targetTouches[0].pageX - canvasOffset.left));
				y = mouseStart.y = Math.max(0, Math.min(canvas.height - 2, event.targetTouches[0].pageY - canvasOffset.top));
				//alert("targetTouches: yep")
			} else {
				alert("something fishy")
			}

			that.doMouseDown(x, y);
			return cancelEvent(event);
		}

		canvas.ontouchend = function doMouseUp(event) {
			var x, y;
			if (event.changedTouches) {
				x = Math.max(0, Math.min(canvas.width - 2, event.changedTouches[0].pageX - canvasOffset.left));
				y = Math.max(0, Math.min(canvas.height - 2, event.changedTouches[0].pageY - canvasOffset.top));
			}
			that.doMouseUp(x, y);
			return cancelEvent(event);
		}

		canvas.ontouchmove = function doMouseMove(event) {
			var x, y
			if (event.changedTouches) {
				x = mouseNow.x = Math.max(0, Math.min(canvas.width - 2, event.changedTouches[0].pageX - canvasOffset.left));;
				y = mouseNow.y = Math.max(0, Math.min(canvas.height - 2, event.changedTouches[0].pageY - canvasOffset.top));
			}
			that.doMouseMove(x, y);
			//alert("touchmove");
			return cancelEvent(event);
		}

		canvas.onmousedown = function doMouseDown(event) {
			var x, y;
			if (event.offsetX) {
				x = mouseStart.x = Math.max(0, Math.min(canvas.width - 2, event.offsetX));
				y = mouseStart.y = Math.max(0, Math.min(canvas.height - 2, event.offsetY));
				//alert("offsetX: yep")
			} else if (event.layerX) {
				x = mouseStart.x = Math.max(0, Math.min(canvas.width - 2, event.layerX));
				y = mouseStart.y = Math.max(0, Math.min(canvas.height - 2, event.layerY));
				//alert("layerX: yep")
			}

			//alert(x+"  "+y);
			that.doMouseDown(x, y);
			return cancelEvent(event);
		}

		canvas.onmouseup = function doMouseUp(event) {
			var x, y
			if (event.offsetX) {
				x = Math.max(0, Math.min(canvas.width - 2, event.offsetX));
				y = Math.max(0, Math.min(canvas.height - 2, event.offsetY));
			} else if (event.layerX) {
				x = Math.max(0, Math.min(canvas.width - 2, event.layerX));
				y = Math.max(0, Math.min(canvas.height - 2, event.layerY));
			}
			that.doMouseUp(x, y);
			return cancelEvent(event);
		}

		canvas.onmousemove = function doMouseMove(event) {
			var x, y
			if (event.offsetX) {
				x = mouseNow.x = Math.max(0, Math.min(canvas.width - 2, event.offsetX));
				y = mouseNow.y = Math.max(0, Math.min(canvas.height - 2, event.offsetY));
			} else if (event.layerX) {
				x = mouseNow.x = Math.max(0, Math.min(canvas.width - 2, event.layerX));
				y = mouseNow.y = Math.max(0, Math.min(canvas.height - 2, event.layerY));
			}
			that.doMouseMove(x, y);
			//alert("touchmove");
			return cancelEvent(event);
		}




	}

	game.disactivateEvents = function() {

		canvas.ontouchstart = canvas.onmousedown = null;
		canvas.ontouchend = canvas.onmouseup = null;
		canvas.ontouchmove = canvas.onmousemove = null;
	}


	game.hide = function() {

		document.getElementById(divId).style.display = "none";
		game.disactivateEvents();

		adManager.hide();

		(game.data) && (levelStats.close(this.data));
	}

	game.show = function() {

		document.getElementById(divId).style.display = "";
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
			this.loadLevel(this.book.levels[this.data.index+1]);
		}
	}





		


	return game;
}

var game = makeGame("gameCanvas", "gameDiv");
