"use strict";

var Levels = {}

Levels.loadBook = function(book){
        console.log(book.link);
        $.getJSON(book.link, {}, function(data) {
	        var container = $("#Levels .content");
                container.html("");

	        for (var i=0; i<data.levels.length; i++) {
			var level = data.levels[i];
			var icon = $(document.createElement("canvas"));
			icon.attr("class", "levelIcon");
			icon.css("width", "55px");
			icon.css("height","55px");
			icon.prop("width", 55*window.devicePixelRatio);;
			icon.prop("height", 55*window.devicePixelRatio);
			drawIcon(level, icon.get()[0]);
			icon.prop("level", level);
			icon.click(function() {
				Levels.startLevel(level);
			});
			container.append(icon);
                }
	});
}

levelMenu.startLevel = function(level){
        game.clearScreen();
	game.loadLevel(level);
	screenManager.switchTo("gameScreen");
}

Levels.newLevel = function(){
	var level = makeLevel();
	level.book = this.book;
	this.book.levels.push(level);
	this.loadBook(this.book);
}

