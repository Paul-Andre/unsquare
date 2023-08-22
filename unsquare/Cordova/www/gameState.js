"use strict";

function GameState(level) {
  var tileStates = level.tiles.clone();
  tileStates.forEachSet(function () {
    return {
      selected: false,
      oldSelected: false,
      transitionState: 0,
    };
  });

  this.tiles = level.tiles.clone();
  this.tileStates = tileStates;

  this.level = level;
  this.undoList = [];
  this.lastUpdateTimestamp = performance.now();
  this.numMoves = 0;
}


GameState.prototype.isClear = function isClear() {
  var clear = true;

  this.tiles.forEach(function (v) {
    if (v != 1) {
      clear = false;
    }
  });

  return clear;
};

GameState.prototype.applyMove = function (move, action) {
  if (move != null) {
    this.undoList.push({
      tiles: this.tiles.clone(),
      move: move,
    });
    this.level.tileShape.forTilesInMoveSet(this.tiles, move, action);
  }
  this.numMoves+=1;
};

// TODO: make undo be at a different level

GameState.prototype.undo = function () {
  if (this.undoList.length > 0) {
    var undo = this.undoList.pop();
    this.tiles = undo.tiles;
    this.numMoves-=1;
  }
};
