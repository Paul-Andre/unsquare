"use strict";

var levelMenu = {}

levelMenu.openBook = function(book){
	this.book = book;
	var container = $("#levelMenu .content").get()[0];
	container.innerHTML = "";

	for (var i=0; i<book.levels.length; i++) {
		container.appendChild(levelMenu.createLevelInfo(book.levels[i]));
	}
}

levelMenu.createLevelInfo = function(level){
	var icon = document.createElement("canvas");
	icon.className = "levelIcon";
	icon.style.width = "55px";
	icon.style.height = "55px";
	icon.width = 55*window.devicePixelRatio;
	icon.height = 55*window.devicePixelRatio;
	drawIcon(level, icon);
	icon.level = level;
	icon.onclick = function() {
		levelMenu.startLevel(this.level);
	};
	return icon;
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


