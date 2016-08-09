var game = makeGame("gameCanvas", "gameScreen");

game.restart = function restart() {
	levelStats.close(this.level);
	game.loadLevel(this.level);
	game.draw(ctx);
};

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
