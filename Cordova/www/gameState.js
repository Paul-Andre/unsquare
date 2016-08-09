"use strict";

function GameState(level) {
	
	var tileStates = level.tiles.clone();
	tileStates.forEachSet(function(){
		return {
			selected: false,
			transitionState: 0,
		};
	});

	this.tiles= level.tiles.clone();
	this.tileStates= tileStates;
	this.touchedTile= {
		touched: false,
		x:0, y:0,
		transitionState: 0,
	};
	this.level = level;
	this.undoList = [];
}


GameState.prototype.isClear = function isClear() {
	var clear = true;

	this.tiles.forEach(function(v) {
		// TODO: use a function defined in colors to see if it is clear
		if (v != 1) {
			clear = false;
		}
	});

	return clear;
}
