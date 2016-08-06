

// Square file

/// Given fractional positions the two corners of the dragged rectangle
/// relative to the grid, returns the top right corner and size of square
/// to be inverted.  Output is in the form of {x: int, y: int, size: int}
/// You still need to check if the "size" of the output is bigger than 1.
function calculateSquare(x1, y1, x2, y2) {
	


	// Specify the direction in which the square goes. 1 is the default value.
	var xSign = Math.sign(x2 - x1) || 1;
	var ySign = Math.sign(y2 - y1) || 1;

	// Get the starting cell.
	var x = Math.floor(x1);
	var y = Math.floor(y1);

	// The size of the square
	var size = Math.max(Math.abs(Math.floor(x2) - x), Math.abs(Math.floor(y2) - y)) + 1;

	// Adjustments if the square goes in negative directions
	if (xSign == -1) {
		x+=1;
	}
	if (ySign == -1) {
		y+=1;
	}

	// Making sure that the square doesn't exit the screen.
	if (x + size*xSign < 0) {
		size = x;
	}
	else if (x + size*xSign >= game.grid.width) {
		size = game.grid.width-x;
	}

	if (y + size*ySign < 0) {
		size = y;
	}
	else if (y + size*ySign >= game.grid.height) {
		size = game.grid.height-y;
	}

	// Return a square with x,y representing the top left corner.
	return {
		x: Math.min(x, x+size*xSign),
		y: Math.min(y, y+size*ySign),
		size: size,
	}
}


// Square
game.updatePreGrid = function(x1, y1, x2, y2) {

	var invertingSquare = calculateSquare(x1, y1, x2, y2);

	var that = this;

	this.preGrid.setAll(0);
	if (invertingSquare.size > 1) {
		this.preGrid.window(invertingSquare.x, invertingSquare.y, invertingSquare.size, invertingSquare.size)
			.forEachSet(function(value, x, y) {
				return(that.level.type.color.unsquare(that.grid.get(x + invertingSquare.x, y + invertingSquare.y)));
			}) ;
	}

}