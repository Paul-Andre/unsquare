"use strict";


//  TODO make this more like a class
//
function makeLevel() {
	var grid = Grid.empty(4,4);
	grid.setAll(1);
	return {
		colorScheme: colorSchemes.BW,
		tileShape: tileShapes.square,
		tiles: grid,
		par: 0,
		solution: []
	};
}

function copyLevelInto(level,otherLevel) {
	otherLevel.colorScheme = level.colorScheme;
	otherLevel.tileShape = level.tileShape;
	otherLevel.tiles = level.tiles.clone();
	otherLevel.par = level.par;
	otherLevel.solution = level.solution.slice();
	return otherLevel;
}
