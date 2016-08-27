"use strict";

var levelMenu = {}

levelMenu.openBook = function(book){
	this.book = book;
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
	if (IS_EDITOR) {
		editor.openLevel(level);
		screenManager.switchTo("editor");
	} else {
		game.openLevel(level);
		screenManager.switchTo("game");
	}

}

levelMenu.newLevel = function(){
	var level = Level.empty();
	level.book = this.book;
	this.book.levels.push(level);
	this.displayIcons();
}

levelMenu.displayIcons = function(){
	var container = $("#levelMenu .content").get()[0];
	container.innerHTML = "";

	for (var i=0; i<this.book.levels.length; i++) {
		container.appendChild(levelMenu.createLevelInfo(this.book.levels[i]));
	}

	Sortable.create(container);
}

levelMenu.displayBookJson = function() {
	prompt("", JSON.stringify({
		levels: this.book.levels.map(function(level){
			return level.toJsonObject();
		})
	}));
}


levelMenu.onShow = levelMenu.displayIcons;

screenManager.additionalFunctions.levelMenu = levelMenu;
