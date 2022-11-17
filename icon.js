"use strict";
// Pretty self explanatory. It draws the icon for the given level on the canvas.
// It creates a new context and draws the icon such that it covers the whole canvas.

function drawIcon(level, canvas) {
  let colorScheme = colorSchemes[level.colorScheme || "BW"];
  let tileShape = tileShapes[level.tileShape || "square"];

  let tiles = tileShape.gridFromJsonObject(level.tiles);

  var cellWidth = canvas.width / tiles.width;
  var cellHeight = canvas.height / tiles.height;

  console.log(cellWidth);

  var ctx = canvas.getContext("2d");

  tiles.forEach(function(v, x, y) {
    let f = colorScheme.cells[v].fill;
    //console.log(f,x,y);
    ctx.fillStyle = f;
    ctx.fillRect(
      Math.floor(cellWidth * x),
      Math.floor(cellHeight * y),
      Math.ceil(cellWidth),
      Math.ceil(cellHeight)
    );
  });
}
