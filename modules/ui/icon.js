"use strict";
// Pretty self explanatory. It draws the icon for the given level on the canvas.
// It creates a new context and draws the icon such that it covers the whole canvas.

// function square_geometry_foreach(array, w, h, f) {

// }

export function createLevelIcon(level) {
  return createLevelIconCanvas(level);
}

export function createLevelIconCanvas(level) {
  const icon = document.createElement("canvas");
  icon.style.width = "55px";
  icon.style.height = "55px";
  icon.width = 55 * window.devicePixelRatio;
  icon.height = 55 * window.devicePixelRatio;
  drawIcon(level, icon);
  return icon;
}

export function drawIcon(level, canvas) {
  if (level.colorScheme) {
    let colorScheme = level.colorScheme;

    let tileShape = level.tileShape;

    let tiles = level.tiles;

    var cellWidth = canvas.width / tiles.width;
    var cellHeight = canvas.height / tiles.height;

    var ctx = canvas.getContext("2d");

    tiles.forEach(function (v, x, y) {
      let f = colorScheme.cells[v].fill;
      ctx.fillStyle = f;
      ctx.fillRect(
        Math.floor(cellWidth * x),
        Math.floor(cellHeight * y),
        Math.ceil(cellWidth),
        Math.ceil(cellHeight)
      );
    });
  }
}
