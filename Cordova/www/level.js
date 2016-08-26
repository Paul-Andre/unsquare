"use strict";

function Level() {
}

Level.empty = function makeLevel() {
	var grid = Grid.empty(4,4);
	grid.setAll(1);
	var level = new Level();
	level.colorScheme = colorSchemes.BW;
	level.tileShape = tileShapes.square;
	level.tiles = grid;
	level.par = 0;
	level.solution = [];
	return level;
};

Level.fromJsonObject = function(json) {
	var level = new Level();
	level.colorScheme = colorSchemes[json.colorScheme];
	level.tileShape = tileShapes[json.tileShape];
	level.tiles = level.tileShape.gridFromJsonObject(json.tiles);
	level.par = json.par;
	level.solution = json.solution;
	return level;
};

Level.prototype.toJsonObject = function() {
	var json = {};
	json.colorScheme = this.colorScheme.name;
	json.tileShape = this.tileShape.name;
	json.tiles = this.tiles.to2dArray();
	json.par = this.par;
	json.solution = this.solution;
	return json;
};

Level.prototype.clone = function() {
	var level = new Level();
	level.copyFrom(this);
	return level;
};

Level.prototype.copyFrom = function(otherLevel) {
	this.colorScheme = otherLevel.colorScheme;
	this.tileShape = otherLevel.tileShape;
	this.tiles = otherLevel.tiles.clone();
	this.par = otherLevel.par;
	this.solution = otherLevel.solution.slice();
}
