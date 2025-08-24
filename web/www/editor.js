"use strict";

class Editor extends GameBase {
  constructor(canvasId, divId) {
    super(canvasId, divId);
    this.referenceToOriginalLevel = null;
    this.runningSolution = null;
    
    // Override openLevel to handle editor-specific behavior
    this.openLevel = this.editorOpenLevel.bind(this);
  }

  editorOpenLevel(level, book) {
    // We don't want the editor to open the actual level.
    // The reason I don't just put it in the base is that at some point the game might need to modify the level
    this.referenceToOriginalLevel = level;
    super.openLevel(level.clone(), book);
  }

  // this specifies what happens when you activate squares
  // (as in, do you UNsquare or you go the other way)
  action(v) {
    return this.level.colorScheme.resquare(v);
  }

  updateLevelInfo() {
    // Note that this modifies the copy of level, not the reference to the original level
    this.level.tiles = this.tiles;
    this.level.solutionVector = this.runningSolution;
    // TODO: ???
    this.level.par = null;
  }

  saveLevel() {
    this.updateLevelInfo();
    this.referenceToOriginalLevel.copyFrom(this.level);
    save_editor_book(this.book);
  }

  restoreUndoState(undo) {
    this.initializeTiles(undo.level, this.book);
    this.numMoves -= 1;
  }

  createUndoState(move) {
    return {
      level: this.level.clone(),
      move: move,
    };
  }

  submitSolution() {
    let sol_string = window.prompt("Solution in 01010101010 format");
    let sol = Array.from(sol_string).map((x) => Number(x));
    console.log(sol);

    this.updateLevelInfo();
    let check = level_check_solution(this.level, sol);
    if (check) {
      this.saveStateForUndo();
      this.level.solutionVector = sol;
      this.level.solutionType = "submitted";

      this.initializeTiles(this.level, this.book);
    } else {
      alert("Solution not satisfactory");
    }
  }

  submitCompact() {
    let string = window.prompt("String representing the level (as found in the link's custom param");
    let level = Level.fromCompact(string);
    if (level) {
      this.saveStateForUndo();
      this.level = level;
      this.initializeTiles(this.level, this.book);
    } else {
      alert("Could not parse string");
    }
  }

  postApplyMove() {
    this.updateLevelInfo();
    if (this.level.solutionType == "reverse" || this.level.solutionType == "confirmed") {
      this.level.solutionType = "reverse";
    } else {
      this.level.solutionType = "mixed";
    }
    if (vector_sum(this.level.solutionVector) <= 3) {
      this.level.solutionType = "confirmed";
    }
  }

  clear() {
    this.saveStateForUndo();
    this.tiles.forEachSet(function () {
      return 1;
    });
    let m = this.operations.length;
    this.runningSolution = new Array(m).fill(0);
    this.updateGui();
  }

  play() {
    this.updateLevelInfo();
    game.openLevel(this.level, this.book);
    screenManager.switchTo("game");
  }

  specificOnShow() {
    if (!vector_equal(this.level.solutionVector, this.runningSolution)) {
      this.initializeTiles(this.level, this.book);
    }
  }

  promptSize() {
    var size = window.prompt();
    if (size !== null) {
      // TODO make sure it doesn't break the Grid abstraction here.
      var size = new Number(size);
      if (!isNaN(size)) {
        this.saveStateForUndo();

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
  }

  saveAndReturn() {
    this.saveLevel();
    screenManager.goBack();
  }

  setText(text) {
    this.level.text = text;
  }

  printFlat() {
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
  }

  updateGui() {
    this.updateLevelInfo();

    if (this.runningSolution) {
      let sum = vector_sum(this.level.solutionVector);
      let type = this.level.solutionType;
      this.div.getElementsByClassName("editorBest")[0].innerText = sum + " " + type;
    } else {
      this.div.getElementsByClassName("editorBest")[0].innerText = "? " + type;
    }
  }

  // TODO: hardcode the url?
  getCustomUrl() {
    let base = location.origin + location.pathname;
    let encoding = get_level_compact_solution(this.level);
    return base + "?custom=" + encoding;
  }

  displayShare() {
    let sol_string = window.prompt("URL for sharing", this.getCustomUrl());
  }
}

const editor = new Editor("editorCanvas", "editor");

screenManager.additionalFunctions.editor = editor;
