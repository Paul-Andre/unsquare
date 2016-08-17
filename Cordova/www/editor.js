var editor = makeGameBase("editorCanvas", "editor");

// this specifies what happens when you activate squares
editor.action = function(v){
	return editor.level.colorScheme.resquare(v);
};

editor.saveLevel = function(){
	editor.level.tiles = this.gameState.tiles;
}

editor.clear = function(){
	editor.tiles.forEachSet(function(){
		return 1;
	});
}

editor.play = function(){
	this.level.tiles = this.gameState.tiles;
	game.openLevel(this.level);
	screenManager.switchTo("game");
}

screenManager.additionalFunctions.editor = editor;
