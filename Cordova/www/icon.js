"use strict";
// Pretty self explanatory. It draws the icon for the given level on the canvas.
// It creates a new context and draws the icon such that it covers the whole canvas.
function drawIcon(level, canvas) {
  var ctx = canvas.getContext("2d");

  var cellWidth = canvas.width / level.tiles.width;
  var cellHeight = canvas.height / level.tiles.height;

  level.tiles.forEach(function(v, x, y) {
    ctx.fillStyle = level.colorScheme.cells[v].fill;
    ctx.fillRect(
      Math.floor(cellWidth * x),
      Math.floor(cellHeight * y),
      Math.ceil(cellWidth),
      Math.ceil(cellHeight));

  });
}