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
	icon.onclick = levelMenu.onIconClick; 
	return icon;
}




// this function is to be called on icons using the onclick event
// so "this" refers to the icon element, not levelMenu
levelMenu.onIconClick = function(){
	if (IS_EDITOR) {
		if (levelMenu.deleting) {
			this.remove();
			levelMenu.saveIconOrder();
		} else {
			editor.openLevel(this.level);
			screenManager.switchTo("editor");
		}
	} else {
		game.openLevel(this.level);
		screenManager.switchTo("game");
	}

}

levelMenu.container = document.querySelector("#levelMenu .content");

levelMenu.displayIcons = function(){
	this.container.innerHTML = "";

	for (var i=0; i<this.book.levels.length; i++) {
		this.container.appendChild(levelMenu.createLevelInfo(this.book.levels[i]));
	}
}

if (IS_EDITOR) {
	levelMenu.sortable = Sortable.create(levelMenu.container, {
		onSort: function(){
			levelMenu.saveIconOrder();
		}
	});


	levelMenu.saveIconOrder = function(){
		levelMenu.book.levels = Array.prototype.map.call(levelMenu.container.children,
				function(child) {
					return child.level;
				});
	};


	levelMenu.newLevel = function(){
		var level = Level.empty(6);
		level.book = this.book;
		this.book.levels.push(level);
		this.displayIcons();
	};

	levelMenu.displayBookJson = function() {
		prompt("", JSON.stringify({
			levels: this.book.levels.map(function(level){
				return level.toJsonObject();
			})
		}));
	};

	let deleteButton = document.getElementById("deleteButton");

	levelMenu.deleting = false;

	deleteButton.onclick = function(){
		// toggle the deleting state
		levelMenu.deleting = levelMenu.deleting == false;
		levelMenu.container.classList.toggle("deleting");
	};


}


levelMenu.onShow = levelMenu.displayIcons;

screenManager.additionalFunctions.levelMenu = levelMenu;
