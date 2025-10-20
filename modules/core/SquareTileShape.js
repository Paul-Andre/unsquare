"use strict";

import { Grid } from './Grid.js';

export class SquareTileShape {
  constructor() {
    this.name = "square";
  }

  /**
   * Given fractional positions the two corners of the dragged rectangle
   * relative to the grid, returns the top right corner and size of square
   * to be inverted. Output is in the form of {x: int, y: int, size: int}
   * You still need to check if the "size" of the output is bigger than 1.
   * The numbers are between 0 and gridWidth or gridHeight, not between 0 and 1.
   */
  calculateSquare(x1, y1, x2, y2, gridWidth, gridHeight) {
    // Specify the direction in which the square goes. 1 is the default value.
    const xSign = Math.sign(x2 - x1) || 1;
    const ySign = Math.sign(y2 - y1) || 1;

    // Get the starting cell.
    let x = Math.floor(x1);
    let y = Math.floor(y1);

    // The size of the square
    let size =
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

  gridFromJsonObject(tiles) {
    return Grid.from2dArray(tiles);
  }

  /**
   * From [0, 1] to [0, "grid dimension"]
   */
  coordinatesFromMousePosition(x, y, tiles) {
    return {
      x: Math.floor(x * tiles.width),
      y: Math.floor(y * tiles.height),
    };
  }

  /**
   * Position on the canvas as if it was stretched to be from 0 to 1
   */
  positionFromCoordinates(x, y, tiles) {
    return {
      x: (x + 0.5) / tiles.width,
      y: (y + 0.5) / tiles.height,
    };
  }

  /**
   * Function that creates a move based on the coordinates of start and
   * end of the mouse drag.
   */
  moveFromMousePositions(x1, y1, x2, y2, tiles) {
    const width = tiles.width;
    const height = tiles.height;

    const move = this.calculateSquare(
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

  forTilesInMoveSet(grid, move, action) {
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
  moveToVector(grid, move) {
    let move_grid = Grid.empty(grid.width, grid.height);
    move_grid.setAll(0);
    this.forTilesInMoveSet(move_grid, move, () => 1);
    return move_grid.array;
  }

  forTilesInMove(grid, move, action) {
    if (move !== null)
      grid
        .window(move.x, move.y, move.size, move.size)
        .forEach(function (v, x, y) {
          action(v, x + move.x, y + move.y);
        });
  }

  select(x1, y1, x2, y2, tileStates) {
    const width = tileStates.width;
    const height = tileStates.height;

    const invertingSquare = this.calculateSquare(
      x1 * width,
      y1 * height,
      x2 * width,
      y2 * height,
      width,
      height
    );
    const x = invertingSquare.x;
    const y = invertingSquare.y;
    const size = invertingSquare.size;

    // Store old selection state for comparison
    tileStates.forEach(function (v) {
      v.oldSelected = v.selected;
      v.selected = false;
    });

    // Select tiles for both single and multiple tile selections
    tileStates.window(x, y, size, size).forEach(function (v) {
      v.selected = true;
    });
  }

  // Calculate proportional border width based on tile size
  getBorderWidth(tileWidth, tileHeight) {
    const minDimension = Math.min(tileWidth, tileHeight);
    // Base border width is 2px, scale up to 8px max based on tile size
    // TODO: this seems to be overly complicated, but I'll leave it for now
    const baseWidth = 2;
    const maxWidth = 8;
    const scaleFactor = Math.min(minDimension / 100, 1); // Scale based on 50px reference
    return Math.max(
      baseWidth,
      Math.min(maxWidth, baseWidth + (maxWidth - baseWidth) * scaleFactor)
    );
  }

  // TODO: refactor or expose?
  // TODO: standardize whether use context transforms or passing coordinates...
  draw_tile(
    ctx,
    gameState,
    changeFunction,
    x,
    y,
    width,
    height,
    tileValue,
    tileState,
    isSingleTileSelection = false,
    isHovered = false
  ) {
    const transitionState = tileState.transitionState;

    let mainColor;
    let insetColor;
    let insetState;

    if (transitionState < 0.5) {
      mainColor =
        gameState.level.colorScheme.cells[changeFunction(tileValue)].fill;
      insetColor = gameState.level.colorScheme.cells[tileValue].fill;
      insetState = tileState.reverseInsetState;
    } else {
      mainColor = gameState.level.colorScheme.cells[tileValue].fill;
      insetColor =
        gameState.level.colorScheme.cells[changeFunction(tileValue)].fill;
      insetState = tileState.insetState;
    }

    const heightMult = Math.abs(Math.cos(transitionState * Math.PI));

    const newHeight = height * heightMult;
    const newY = y + (height - newHeight) * 0.5;

    height = newHeight;
    y = newY;

    ctx.fillStyle = mainColor;
    ctx.fillRect(x, y, width, height * heightMult);

    // Draw hover border
    if (isHovered && !tileState.selected) {
      ctx.strokeStyle = "#87ceeb"; // Light blue color
      ctx.lineWidth = this.getBorderWidth(width, height * heightMult)*0.5;
      ctx.strokeRect(x, y, width, height * heightMult);
    }

    ctx.fillStyle = insetColor;

    // Don't draw inset for single tile selections
    if (insetState && !isSingleTileSelection) {
      return;
      const insetProportion = 0.5;
      const squareWidth = width * insetState * insetProportion;
      const squareHeight = height * heightMult * insetState * insetProportion;
      const squareOffsetX = width * (1 - insetState * insetProportion) * 0.5;
      const squareOffsetY =
        height * heightMult * (1 - insetState * insetProportion) * 0.5;
      ctx.fillRect(
        x + squareOffsetX,
        y + squareOffsetY,
        squareWidth,
        squareHeight
      );
    }
  }

  // TODO: remove this from here
  draw(ctx, gameState, changeFunction, hoveredTile = null) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const width = ctx.canvas.width / (gameState.tiles.width + 0.1);
    const height = ctx.canvas.height / (gameState.tiles.height + 0.1);

    const padding = width * 0.1;

    // Calculate selection bounds and count
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let hasSelection = false;
    let selectedTiles = [];
    let selectedCount = 0;

    // First pass: count selected tiles
    gameState.tiles.forEach((value, x, y) => {
      const tileState = gameState.tileStates.get(x, y);
      if (tileState.selected) {
        selectedCount++;
      }
    });

    // Second pass: draw tiles and track bounds
    gameState.tiles.forEach((value, x, y) => {
      const tileState = gameState.tileStates.get(x, y);

      ctx.fillStyle = gameState.level.colorScheme.cells[value].fill;

      this.draw_tile(
        ctx,
        gameState,
        changeFunction,
        x * width + padding,
        y * height + padding,
        width - padding,
        height - padding,
        value,
        tileState,
        selectedCount === 1 && tileState.selected,
        hoveredTile && hoveredTile.x === x && hoveredTile.y === y
      );

      // Track selection bounds
      if (tileState.selected) {
        hasSelection = true;
        selectedTiles.push({ x, y });
        const tileX = x * width + padding;
        const tileY = y * height + padding;
        const tileWidth = width - padding;
        const tileHeight = height - padding;

        minX = Math.min(minX, tileX);
        minY = Math.min(minY, tileY);
        maxX = Math.max(maxX, tileX + tileWidth);
        maxY = Math.max(maxY, tileY + tileHeight);
      }
    });

    // Draw selection border
    if (hasSelection) {
      ctx.strokeStyle = "#4fb6ff";
      const borderWidth = this.getBorderWidth(
        width - padding,
        height - padding
      );
      ctx.lineWidth = borderWidth;

      if (selectedTiles.length === 1) {
        // Single tile selected - draw dashed border around that tile
        const tile = selectedTiles[0];
        const tileX = tile.x * width + padding;
        const tileY = tile.y * height + padding;
        const tileWidth = width - padding;
        const tileHeight = height - padding;

        // Make dash pattern proportional to border width
        const dashLength = Math.max(3, Math.floor(borderWidth * 2));
        ctx.setLineDash([dashLength, dashLength]); // Create dashed line
        ctx.strokeRect(tileX, tileY, tileWidth, tileHeight);
        ctx.setLineDash([]); // Reset to solid line
      } else {
        // Multiple tiles selected - draw solid border around entire selection
        ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
      }
    }
  }

  draw_expanded(ctx, tiles, tileStates, colorScheme, changeFunction) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const width = ctx.canvas.width / (tiles.width + 0.1);
    const height = ctx.canvas.height / (tiles.height + 0.1);

    const padding = width * 0.1;

    tiles.forEach((value, x, y) => {
      const tileState = tileStates.get(x, y);

      ctx.fillStyle = colorScheme.cells[value].fill;
      ctx.fillRect(
        x * width + padding,
        y * height + padding,
        width - padding,
        height - padding
      );

      ctx.fillStyle = colorScheme.cells[changeFunction(value)].fill;

      const squareWidth = (width - padding) * tileState.insetState * 0.5;
      const squareHeight = (height - padding) * tileState.insetState * 0.5;
      const squareOffsetX =
        (width - padding) * (1 - tileState.insetState * 0.5) * 0.5;
      const squareOffsetY =
        (height - padding) * (1 - tileState.insetState * 0.5) * 0.5;
      ctx.fillRect(
        x * width + padding + squareOffsetX,
        y * height + padding + squareOffsetY,
        squareWidth,
        squareHeight
      );
    });
  }
}

// Create global instance for backward compatibility
export const squareTileShape = new SquareTileShape();
