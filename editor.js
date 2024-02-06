var editor = makeGameBase("editorCanvas", "editor");

editor.openLevel = (function () {
  var superOpenLevel = editor.openLevel.bind(editor);
  return function (level, book) {
    // We don't want the editor to open the actual level.
    // The reason I don't just put it in the base is that at some point the game might need to modify the level
    this.referenceToOriginalLevel = level;
    superOpenLevel(level.clone(), book);
  };
})();

// this specifies what happens when you activate squares
// (as in, do you UNsquare or you go the other way)
editor.action = function (v) {
  return editor.level.colorScheme.resquare(v);
};


editor.updateLevelInfo = function () {
  // Note that this modifies the copy of level, not the reference to the original level
  editor.level.tiles = this.tiles;
  editor.level.solutionVector = this.runningSolution;
  // TODO: ???
  editor.level.par = null;
};

editor.saveLevel = function () {
  editor.updateLevelInfo();
  editor.referenceToOriginalLevel.copyFrom(editor.level);
  save_editor_book(this.book);

};

editor.restoreUndoState = function(undo) {
  this.initializeTiles(undo.level, this.book);
  this.numMoves-=1;
}

editor.createUndoState = function(move) {

    return {
      level: this.level.clone(),
      move: move,
    }
}

editor.submitSolution = function() {

  let sol_string = window.prompt("Solution in 01010101010 format");
  let sol = Array.from(sol_string).map( (x) => Number(x));
  console.log(sol);

  this.updateLevelInfo();
  let check = level_check_solution(this.level, sol);
  if (check) {
    editor.saveStateForUndo();
    this.level.solutionVector = sol;
    this.level.solutionType = "submitted";

    this.initializeTiles(this.level, this.book);
  } else {

    alert("Solution not satisfactory");
  }

}

editor.submitCompact = function() {
  let string = window.prompt("String representing the level (as found in the link's custom param");
  let level = Level.fromCompact(string);
  if (level) {
    editor.saveStateForUndo();
    this.level = level
    this.initializeTiles(this.level, this.book);

  } else {
    alert("Could not parse strig");

  }
}

editor.postApplyMove = function() {
  editor.updateLevelInfo();
  if (this.level.solutionType == "reverse" || this.level.solutionType == "confirmed") {
    this.level.solutionType = "reverse";
  } else {
    this.level.solutionType = "mixed";
  }
  if (vector_sum(this.level.solutionVector) <= 3) {
    this.level.solutionType = "confirmed";
  }
}

editor.clear = function () {
  editor.saveStateForUndo();
  editor.tiles.forEachSet(function () {
    return 1;
  });
  let m = this.operations.length;
  this.runningSolution = new Array(m).fill(0);
  this.updateGui();
};

editor.play = function () {
  this.updateLevelInfo();
  game.openLevel(this.level, this.book);
  screenManager.switchTo("game");
};

editor.specificOnShow = function () {
  if(!vector_equal(this.level.solutionVector, this.runningSolution)) {
    this.initializeTiles(this.level, this.book);
  }
}

editor.promptSize = function () {
  var size = window.prompt();
  if (size !== null) {
    // TODO make sure it doesn't break the Grid abstraction here.
    var size = new Number(size);
    if (!isNaN(size)) {

      editor.saveStateForUndo();

      var grid = Grid.empty(size, size);

      grid.setAll(1);

      console.log(grid);

      if (size >= this.tiles.width) {

        // this.tiles.forEach(function (v, x, y) {
        //   grid.set(x, y, v);
        // });

      } else {

      }
      this.level.tiles = grid;

      let operations = compute_operations_for_level(this.level);
      let m = operations.length;
      
      this.level.solutionVector = new Array(m).fill(0);
      this.level.solutionType = "confirmed";

      this.initializeTiles(this.level, this.book);
      //this.tiles = grid;
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

editor.updateGui = function () {
  this.updateLevelInfo();

  if (this.runningSolution) {
    let sum = vector_sum(this.level.solutionVector);
    let type = this.level.solutionType;
    this.div.getElementsByClassName("editorBest")[0].innerText = sum + " "+type;
  } else {
    this.div.getElementsByClassName("editorBest")[0].innerText = "? " + type;
  }
}

// TODO: hardcode the url?


editor.getCustomUrl = function () {
  let base = location.origin + location.pathname;
  let encoding = get_level_compact_solution(editor.level);
  return base + "?custom=" + encoding;
}


editor.displayShare = function () {
  let sol_string = window.prompt("URL for sharing", this.getCustomUrl());
}

screenManager.additionalFunctions.editor = editor;
