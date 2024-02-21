"use strict";

function GameState(level) {
  var tileStates = level.tiles.clone();
  tileStates.forEachSet(function () {
    // TODO: ok, but seriously, does this make sense?
    // Maybe put the animation in a separate object, or combine the tileState
    // value with these? idk... I guess whatever this is works for now...
    return {
      selected: false,
      oldSelected: false,
      insetState: 0,
      reverseInsetState: 0,
      transitionState: 0,
    };
  });

  this.tiles = level.tiles.clone();
  this.tileStates = tileStates;

  this.level = level;
  this.undoList = [];
  this.lastUpdateTimestamp = performance.now();
  this.numMoves = 0;
  this.runningSolution = level.solutionVector.slice();

  this.operations = compute_operations_for_level(this.level);
  this.inverseOperations = new Map();
  for (let i=0; i<this.operations.length; i++) {
    this.inverseOperations.set(this.operations[i].join(""), i);
  }
}


GameState.prototype.applyMove = function (move, action) {
  if (move != null) {
    this.undoList.push({
      tiles: this.tiles.clone(),
      move: move,
      runningSolution: this.runningSolution.slice(),
    });

    this.level.tileShape.forTilesInMoveSet(this.tiles, move, action);
    let vector = this.level.tileShape.moveToVector(this.tiles, move)
    let opIndex = this.inverseOperations.get(vector.join(""));
    // console.log(vector);
    // console.log(opIndex);
    if (this.runningSolution) {
      this.runningSolution[opIndex] += 1;
      vector_simplify_arithmetic(this.runningSolution, this.arithmetic);
    }


  }
  this.numMoves+=1;
};

// Returns either a move
// or "undo" or "restart"
GameState.prototype.getHint = function () {
  //TODO
}

// TODO: make undo be at a different level

GameState.prototype.undo = function () {
  if (this.undoList.length > 0) {
    var undo = this.undoList.pop();
    this.tiles = undo.tiles;
    this.runningSolution = undo.runningSolution;
    this.numMoves-=1;
  }
};
