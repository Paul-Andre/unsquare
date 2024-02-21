"use strict";

(function () {
  /// Given fractional positions the two corners of the dragged rectangle
  /// relative to the grid, returns the top right corner and size of square
  /// to be inverted.  Output is in the form of {x: int, y: int, size: int}
  /// You still need to check if the "size" of the output is bigger than 1.
  /// The numbers are between 0 and gridWidth or gridHeight, not between 0
  /// and 1.
  function calculateSquare(x1, y1, x2, y2, gridWidth, gridHeight) {
    // Specify the direction in which the square goes. 1 is the default value.
    var xSign = Math.sign(x2 - x1) || 1;
    var ySign = Math.sign(y2 - y1) || 1;

    // Get the starting cell.
    var x = Math.floor(x1);
    var y = Math.floor(y1);

    // The size of the square
    var size =
      Math.max(Math.abs(Math.floor(x2) - x), Math.abs(Math.floor(y2) - y)) + 1;

    // Adjustments if the square goes in negative directions
    if (xSign == -1) {
      x += 1;
    }
    if (ySign == -1) {
      y += 1;
    }

    // Making sure that the square doesn't exit the screen.
    if (x + size * xSign < 0) {
      size = x;
    } else if (x + size * xSign >= gridWidth) {
      size = gridWidth - x;
    }

    if (y + size * ySign < 0) {
      size = y;
    } else if (y + size * ySign >= gridHeight) {
      size = gridHeight - y;
    }

    return {
      x: Math.min(x, x + size * xSign),
      y: Math.min(y, y + size * ySign),
      size: size,
    };
  }

  function gridFromJsonObject(tiles) {
    return Grid.from2dArray(tiles);
  }

  /// From [0, 1] to [0, "grid dimention"]
  function coordinatesFromMousePosition(x, y, tiles) {
    return {
      x: Math.floor(x * tiles.width),
      y: Math.floor(y * tiles.height),
    };
  }

  /// position on the canvas as if it was stretch to be from 0 to 1
  function positionFromCoordinates(x, y, tiles) {
    return {
      x: (x + 0.5) / tiles.width,
      y: (y + 0.5) / tiles.height,
    };
  }

  /// Function that creates a move based on the coordinates of start and
  /// end of the mouse drag.
  function moveFromMousePositions(x1, y1, x2, y2, tiles) {
    var width = tiles.width;
    var height = tiles.height;

    var move = calculateSquare(
      x1 * width,
      y1 * height,
      x2 * width,
      y2 * height,
      width,
      height
    );

    if (move.size > 1) {
      return move;
    } else {
      return null;
    }
  }

  function forTilesInMoveSet(grid, move, action) {
    if (move !== null)
      grid
        .window(move.x, move.y, move.size, move.size)
        .forEachSet(function (v, x, y) {
          return action(v, x + move.x, y + move.y);
        });
  }

  // Turns a "move" object to a 0-1 vector representing it
  // Unfortunate that "move" can be interpreted as a verb
  // TODO: I believe I created a whole lexicon of nouns here, so possibly rename
  function moveToVector(grid, move) {
    let move_grid = Grid.empty(grid.width, grid.height);
    move_grid.setAll(0);
    forTilesInMoveSet(move_grid, move, () => 1);
    return move_grid.array;
  }

  function forTilesInMove(grid, move, action) {
    if (move !== null)
      grid
        .window(move.x, move.y, move.size, move.size)
        .forEach(function (v, x, y) {
          action(v, x + move.x, y + move.y);
        });
  }

  function select(x1, y1, x2, y2, tileStates) {
    var width = tileStates.width;
    var height = tileStates.height;

    var invertingSquare = calculateSquare(
      x1 * width,
      y1 * height,
      x2 * width,
      y2 * height,
      width,
      height
    );
    var x = invertingSquare.x;
    var y = invertingSquare.y;
    var size = invertingSquare.size;

    tileStates.forEach(function (v) {
      v.selected = false;
    });

    if (invertingSquare.size > 1) {
      tileStates.window(x, y, size, size).forEach(function (v) {
        v.selected = true;
      });
    }
  }

  // TODO: refactor or expose?
  // TODO: standardize whether use context transforms or passing coordinates...
  function draw_tile(ctx, gameState, changeFunction, x, y, width, height, tileValue, tileState) {
    ctx.fillStyle = gameState.level.colorScheme.cells[tileValue].fill;
    ctx.fillRect(
      x,
      y,
      width,
      height,
    );

    ctx.fillStyle =
      gameState.level.colorScheme.cells[changeFunction(tileValue)].fill;

    var insetProportion = 0.5

    var squareWidth = (width) * tileState.insetState * insetProportion;
    var squareHeight = (height) * tileState.insetState * insetProportion;
    var squareOffsetX =
      (width) * (1 - tileState.insetState * insetProportion) * 0.5;
    var squareOffsetY =
      (height) * (1 - tileState.insetState * insetProportion) * 0.5;
    ctx.fillRect(
      x + squareOffsetX,
      y + squareOffsetY,
      squareWidth,
      squareHeight
    );

  }

  // TODO: remove this from here
  function draw(ctx, gameState, changeFunction) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    var width = ctx.canvas.width / (gameState.tiles.width + 0.1);
    var height = ctx.canvas.height / (gameState.tiles.height + 0.1);

    var padding = width * 0.1;

    gameState.tiles.forEach(function (value, x, y) {
      var tileState = gameState.tileStates.get(x, y);

      ctx.fillStyle = gameState.level.colorScheme.cells[value].fill;

      draw_tile(
        ctx,
        gameState,
        changeFunction,
        x * width + padding,
        y * height + padding,
        width - padding,
        height - padding,
        value,
        tileState,
      );
    });
  }

  function draw_expanded(ctx, tiles, tileStates, colorScheme, changeFunction) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    var width = ctx.canvas.width / (tiles.width + 0.1);
    var height = ctx.canvas.height / (tiles.height + 0.1);

    var padding = width * 0.1;

    tiles.forEach(function (value, x, y) {
      var tileState = tileStates.get(x, y);

      ctx.fillStyle = colorScheme.cells[value].fill;
      ctx.fillRect(
        x * width + padding,
        y * height + padding,
        width - padding,
        height - padding
      );

      ctx.fillStyle =
        colorScheme.cells[changeFunction(value)].fill;

      var squareWidth = (width - padding) * tileState.insetState * 0.5;
      var squareHeight = (height - padding) * tileState.insetState * 0.5;
      var squareOffsetX =
        (width - padding) * (1 - tileState.insetState * 0.5) * 0.5;
      var squareOffsetY =
        (height - padding) * (1 - tileState.insetState * 0.5) * 0.5;
      ctx.fillRect(
        x * width + padding + squareOffsetX,
        y * height + padding + squareOffsetY,
        squareWidth,
        squareHeight
      );
    });
  }

  tileShapes.square = {
    name: "square",
    coordinatesFromMousePosition: coordinatesFromMousePosition,
    positionFromCoordinates: positionFromCoordinates,
    moveFromMousePositions: moveFromMousePositions,
    select: select,
    draw: draw,
    forTilesInMove: forTilesInMove,
    forTilesInMoveSet: forTilesInMoveSet,
    gridFromJsonObject: gridFromJsonObject,
    moveToVector: moveToVector,
    draw_expanded: draw_expanded,
  };
})();
