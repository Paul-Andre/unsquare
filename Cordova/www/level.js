function makeLevel() {
	var grid = Grid.empty(4,4);
	grid.setAll(1);
	return {
		type: colors.BW,
		tiles: grid,
		par: 0,
		solution: []
	};
}
