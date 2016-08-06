"use strict";

var levelMenu = {book:null}

levelMenu.loadBook=function(book){

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
			levelMenu.startLevel(this.level);
		};
		iconContainer.appendChild(icon);
	}
}

levelMenu.startLevel = function(level){
	game.clearScreen();
	game.loadLevel(level);
	screenManager.switchTo("gameScreen");
}

levelMenu.newLevel = function(){
	var level = makeLevel();
	level.book = this.book;
	this.book.levels.push(level);
	this.loadBook(this.book);
}

