"use strict";

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
