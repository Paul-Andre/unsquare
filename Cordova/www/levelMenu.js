"use strict";

var levelMenu = {}

levelMenu.openBook = function(book){
	this.book = book;
	var container = $("#levelMenu .content");
	container.html("");

	for (var i=0; i<book.levels.length; i++) {
		var level = book.levels[i];
		var icon = $(document.createElement("canvas"));
		icon.attr("class", "levelIcon");
		icon.css("width", "55px");
		icon.css("height","55px");
		icon.prop("width", 55*window.devicePixelRatio);
		icon.prop("height", 55*window.devicePixelRatio);
		drawIcon(level, icon.get()[0]);
		icon.prop("level", level);
		icon.click(function() {
			levelMenu.startLevel(level);
		});
		container.append(icon);
	}
}


levelMenu.startLevel = function(level){
	game.openLevel(level);
	screenManager.switchTo("game");
}

levelMenu.newLevel = function(){
	var level = makeLevel();
	level.book = this.book;
	this.book.levels.push(level);
	this.openBook(this.book);
}


