var editor = makeGameBase("editorCanvas", "editor");

editor.openLevel = (function(){
	var superOpenLevel = editor.openLevel.bind(editor);
	return function(level){
		// We don't want the editor to open the actual level.
		// The reason I don't just put it in the base is that at some point the game might need to modify the level
		this.referenceToOriginalLevel = level;
		superOpenLevel(copyLevelInto(level,{}));
	};
})();

// this specifies what happens when you activate squares
editor.action = function(v){
	return editor.level.colorScheme.resquare(v);
};

editor.updateLevelInfo = function(){
	editor.level.tiles = this.gameState.tiles;
	editor.level.solution = this.gameState.undoList.map(function(undo){
		return undo.move;
	});
	editor.level.par = editor.level.solution.length;
}


editor.saveLevel = function(){
	editor.updateLevelInfo();
	copyLevelInto(editor.level, editor.referenceToOriginalLevel);
}

editor.clear = function(){
	editor.gameState.tiles.forEachSet(function(){
		return 1;
	});
}

editor.play = function(){
	this.updateLevelInfo();
	game.openLevel(this.level);
	screenManager.switchTo("game");
}

editor.promptSize = function(){
	var size = window.prompt();
	if (size!==null) {
		// TODO make sure it doesn't break the Grid abstraction here.
		var size = new Number(size);
		if (!isNaN(size)){

			var grid = Grid.empty(size,size);
			grid.setAll(1);

			if (size>=this.gameState.tiles.width) {
				this.gameState.tiles.forEach(function(v,x,y){
					grid.set(x,y,v);
				});
			}

			this.level.tiles = grid;
			this.gameState = new GameState(this.level);
		}
	}
}

editor.saveAndReturn = function(){
	this.saveLevel();
	screenManager.goBack();
}

screenManager.additionalFunctions.editor = editor;
