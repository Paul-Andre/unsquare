// Pretty self explanatory. It draws the icon for the given level on the canvas.
// It creates a new context and draws the icon such that it covers the whole canvas.
function drawIcon(level, canvas) {
	var ctx = canvas.getContext("2d");
	ctx.fillStyle = "#000000";
	ctx.fillRect(canvas.width/3, canvas.height/3, canvas.width/3, canvas.height/3);
}

