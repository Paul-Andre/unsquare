var editor = makeGameBase("editorCanvas", "editor");

editor.openLevel = (function () {
  var superOpenLevel = editor.openLevel.bind(editor);
  return function (level) {
    // We don't want the editor to open the actual level.
    // The reason I don't just put it in the base is that at some point the game might need to modify the level
    this.referenceToOriginalLevel = level;
    superOpenLevel(level.clone());
    this.movesThatCantBeUndone = this.level.solution;
  };
})();

// this specifies what happens when you activate squares
// (as in, do you UNsquare or you go the other way)
editor.action = function (v) {
  return editor.level.colorScheme.resquare(v);
};

editor.getJoinedSolution = function () {
  return this.movesThatCantBeUndone.concat(
    this.undoList.map(function (undo) {
      return undo.move;
    })
  );
};

editor.updateLevelInfo = function () {
  // Note that this modifies the copy of level, not the reference to the original level
  editor.level.tiles = this.tiles;
  editor.level.solution = editor.getJoinedSolution();
  editor.level.par = editor.level.solution.length;
};

editor.saveLevel = function () {
  editor.updateLevelInfo();
  editor.referenceToOriginalLevel.copyFrom(editor.level);
  save_editor_book(current_book);

};

editor.clear = function () {
  editor.tiles.forEachSet(function () {
    return 1;
  });
  editor.undoList = [];
  editor.movesThatCantBeUndone = [];
};

editor.play = function () {
  this.updateLevelInfo();
  game.openLevel(this.level);
  screenManager.switchTo("game");
};

editor.promptSize = function () {
  var size = window.prompt();
  if (size !== null) {
    // TODO make sure it doesn't break the Grid abstraction here.
    var size = new Number(size);
    if (!isNaN(size)) {
      var grid = Grid.empty(size, size);
      grid.setAll(1);

      if (size >= this.tiles.width) {
        this.tiles.forEach(function (v, x, y) {
          grid.set(x, y, v);
        });
        this.movesThatCantBeUndone = this.getJoinedSolution();
      } else {
        this.movesThatCantBeUndone = [];
      }
      this.level.tiles = grid;
    }
  }
};

editor.saveAndReturn = function () {
  this.saveLevel();
  screenManager.goBack();
};

editor.printFlat = function () {
  var ret = "";
  ret += this.tiles.width;
  ret += " ";
  ret += this.tiles.height;
  ret += "\n";
  var tiles = this.tiles;
  for (var j = 0; j < tiles.height; j++) {
    for (var i = 0; i < tiles.width; i++) {
      ret += "" + (tiles.get(i, j) - 1);
    }
    ret += "\n";
  }
  console.log(ret);
};

screenManager.additionalFunctions.editor = editor;
