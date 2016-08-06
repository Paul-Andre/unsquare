"use strict";

function makeLevel() {
	var grid = Grid.empty(4,4);
	grid.setAll(1);
	return {
		type: {
			color: colors.BW,
			shape: shapes.square
		},
		tiles: grid,
		par: 0,
		solution: []
	};
}
