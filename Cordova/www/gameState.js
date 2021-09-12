"use strict";

function GameState(level) {

  var tileStates = level.tiles.clone();
  tileStates.forEachSet(function() {
    return {
      selected: false,
      transitionState: 0,
    };
  });

  this.tiles = level.tiles.clone();
  this.tileStates = tileStates;
  this.touchedTile = {
    touched: false,
    x: 0,
    y: 0,
    transitionState: 0,
  };
  this.level = level;
  this.undoList = [];
  this.lastUpdateTimestamp = performance.now();
}


GameState.prototype.isClear = function isClear() {
  var clear = true;

  this.tiles.forEach(function(v) {
    // TODO: use a function defined in colors to see if it is clear.
    if (v != 1) {
      clear = false;
    }
  });

  return clear;
}


GameState.prototype.applyMove = function(move, action) {
  if (move != null) {
    this.undoList.push({
      tiles: this.tiles.clone(),
      move: move
    });
    this.level.tileShape.forTilesInMoveSet(this.tiles, move, action);
  }
};


GameState.prototype.undo = function() {
  if (this.undoList.length > 0) {
    var undo = this.undoList.pop();
    this.tiles = undo.tiles;
  }
}