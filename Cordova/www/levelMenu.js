"use strict";

var Levels = {book:null}

Levels.loadBook=function(book){

	this.book=book;

	var iconContainer=document.getElementById("iconContainer");


	iconContainer.innerHTML = '';

	for(var i=0;i<book.levels.length;i++){
		var level=book.levels[i];
		var icon=document.createElement("canvas");
		icon.classList.add("levelIcon");

		icon.style.width="55px";
		icon.style.height="55px";
		icon.width=55*window.devicePixelRatio;
		icon.height=55*window.devicePixelRatio;
		drawIcon(level, icon);
		icon.level = level;
		icon.onclick = function() {
			Levels.startLevel(this.level);
		};
		iconContainer.appendChild(icon);
	}
}

Levels.startLevel = function(level){
	Game.clearScreen();
	Game.loadLevel(level);
	screenManager.switchTo("Game");
}

Levels.newLevel = function(){
	var level = makeLevel();
	level.book = this.book;
	this.book.levels.push(level);
	this.loadBook(this.book);
}

