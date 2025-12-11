"use strict";

import { Grid, GridFromArray } from './Grid';
import { ENABLE_INSET_DRAWING } from '../utils/config';

export class SquareTileShape {
  name: "square";

  constructor() {
    this.name = "square";
  }

  /**
   * Given fractional positions the two corners of the dragged rectangle
   * relative to the grid, returns the top right corner and size of square
   * to be inverted.
   * @param {number} x1 - First corner x position (0-1)
   * @param {number} y1 - First corner y position (0-1)
   * @param {number} x2 - Second corner x position (0-1)
   * @param {number} y2 - Second corner y position (0-1)
   * @param {number} gridWidth - Grid width in cells
   * @param {number} gridHeight - Grid height in cells
   * @returns {{x: number, y: number, size: number}} Square coordinates and size. Numbers are between 0 and gridWidth/gridHeight, not between 0 and 1. You still need to check if the "size" is bigger than 1.
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

  /**
   * Converts a 2D array of tiles to a Grid object.
   * @param {number[][]} tiles - 2D array representation of tiles
   * @returns {Grid} Grid object
   */
  gridFromJsonObject(tiles: number[][]): GridFromArray<number> {
    return Grid.from2dArray(tiles);
  }

  /**
   * Converts mouse position from [0, 1] normalized coordinates to [0, grid dimension] cell coordinates.
   * @param {number} x - Normalized x position (0-1)
   * @param {number} y - Normalized y position (0-1)
   * @param {BoundedGrid} tiles - Grid object with width and height properties
   * @returns {{x: number, y: number}} Cell coordinates
   */
  coordinatesFromMousePosition(x, y, tiles) {
    return {
      x: Math.floor(x * tiles.width),
      y: Math.floor(y * tiles.height),
    };
  }

  /**
   * Converts cell coordinates to normalized position on canvas [0, 1].
   * @param {number} x - Cell x coordinate
   * @param {number} y - Cell y coordinate
   * @param {BoundedGrid} tiles - Grid object with width and height properties
   * @returns {{x: number, y: number}} Normalized position (0-1)
   */
  positionFromCoordinates(x, y, tiles) {
    return {
      x: (x + 0.5) / tiles.width,
      y: (y + 0.5) / tiles.height,
    };
  }

  /**
   * Creates a move object based on the start and end coordinates of a mouse drag.
   * @param {number} x1 - Start x position (0-1)
   * @param {number} y1 - Start y position (0-1)
   * @param {number} x2 - End x position (0-1)
   * @param {number} y2 - End y position (0-1)
   * @param {BoundedGrid} tiles - Grid object with width and height properties
   * @returns {{x: number, y: number, size: number}|null} Move object or null if size <= 1
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

  /**
   * Iterates over tiles in a move set, calling action for each tile.
   * @param {BoundedGrid} grid - Grid to iterate over
   * @param {{x: number, y: number, size: number}|null} move - Move object
   * @param {function} action - Function to call for each tile: (value, x, y) => newValue
   */
  forTilesInMoveSet(grid, move, action) {
    if (move !== null)
      grid
        .window(move.x, move.y, move.size, move.size)
        .forEachSet(function (v, x, y) {
          return action(v, x + move.x, y + move.y);
        });
  }

  /**
   * Converts a move object to a 0-1 vector (flat array) representing it.
   * @param {BoundedGrid} grid - Grid object with width and height properties
   * @param {{x: number, y: number, size: number}|null} move - Move object
   * @returns {number[]} Flat array with 1s for tiles in the move, 0s elsewhere
   */
  moveToVector(grid, move) {
    let move_grid = Grid.empty(grid.width, grid.height);
    move_grid.setAll(0);
    this.forTilesInMoveSet(move_grid, move, () => 1);
    return move_grid.array;
  }

  /**
   * Iterates over tiles in a move, calling action for each tile.
   * @param {BoundedGrid} grid - Grid to iterate over
   * @param {{x: number, y: number, size: number}|null} move - Move object
   * @param {function} action - Function to call for each tile: (value, x, y) => void
   */
  forTilesInMove(grid, move, action) {
    if (move !== null)
      grid
        .window(move.x, move.y, move.size, move.size)
        .forEach(function (v, x, y) {
          action(v, x + move.x, y + move.y);
        });
  }

  /**
   * Selects tiles based on mouse drag coordinates.
   * @param {number} x1 - Start x position (0-1)
   * @param {number} y1 - Start y position (0-1)
   * @param {number} x2 - End x position (0-1)
   * @param {number} y2 - End y position (0-1)
   * @param {BoundedGrid} tileStates - Grid of tile state objects with selected property
   */
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

  /**
   * Calculates proportional border width based on tile size.
   * @param {number} tileWidth - Tile width in pixels
   * @param {number} tileHeight - Tile height in pixels
   * @returns {number} Border width in pixels (2-8px)
   */
  getBorderWidth(tileWidth, tileHeight) {
    const minDimension = Math.min(tileWidth, tileHeight);
    const baseWidth = 2;
    const maxWidth = 8;
    const scaleFactor = Math.min(minDimension / 100, 1);
    return Math.max(
      baseWidth,
      Math.min(maxWidth, baseWidth + (maxWidth - baseWidth) * scaleFactor)
    );
  }

  /**
   * Draws a single tile with transition animation and optional inset.
   * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
   * @param {Object} colorScheme - Color scheme object with cells array
   * @param {function} changeFunction - Function to transform tile value
   * @param {number} x - X position in pixels
   * @param {number} y - Y position in pixels
   * @param {number} width - Tile width in pixels
   * @param {number} height - Tile height in pixels
   * @param {number} tileValue - Current tile value
   * @param {Object} tileState - Tile state object with transitionState, insetState, reverseInsetState, selected
   * @param {boolean} [isSingleTileSelection=false] - Whether this is a single tile selection
   * @param {boolean} [isHovered=false] - Whether the tile is being hovered
   */
  draw_tile(
    ctx,
    colorScheme,
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
        colorScheme.cells[changeFunction(tileValue)].fill;
      insetColor = colorScheme.cells[tileValue].fill;
      insetState = tileState.reverseInsetState;
    } else {
      mainColor = colorScheme.cells[tileValue].fill;
      insetColor =
        colorScheme.cells[changeFunction(tileValue)].fill;
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

    // Draw inset if enabled and conditions are met
    if (ENABLE_INSET_DRAWING && insetState && !isSingleTileSelection) {
      ctx.fillStyle = insetColor;
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

  /**
   * Calculates tile dimensions and padding based on canvas and grid size.
   * @param {number} canvasWidth - Canvas width in pixels
   * @param {number} canvasHeight - Canvas height in pixels
   * @param {number} gridWidth - Grid width in cells
   * @param {number} gridHeight - Grid height in cells
   * @returns {{width: number, height: number, padding: number}} Tile dimensions and padding
   */
  _calculateTileDimensions(canvasWidth, canvasHeight, gridWidth, gridHeight) {
    const width = canvasWidth / (gridWidth + 0.1);
    const height = canvasHeight / (gridHeight + 0.1);
    const padding = width * 0.1;
    return { width, height, padding };
  }

  /**
   * Draws the entire grid with tiles, animations, and selection borders.
   * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
   * @param {BoundedGrid} tiles - Grid of tile values
   * @param {BoundedGrid} tileAnimationState - Grid of tile animation state objects
   * @param {Object} level - Level object with colorScheme property
   * @param {function} changeFunction - Function to transform tile value
   * @param {{x: number, y: number}|null} [hoveredTile=null] - Currently hovered tile coordinates
   */
  draw(ctx, tiles, tileAnimationState, level, changeFunction, hoveredTile = null) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const { width, height, padding } = this._calculateTileDimensions(
      ctx.canvas.width,
      ctx.canvas.height,
      tiles.width,
      tiles.height
    );

    // Calculate selection bounds and count
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let hasSelection = false;
    let selectedTiles = [];
    let selectedCount = 0;

    // First pass: count selected tiles
    tiles.forEach((value, x, y) => {
      const tileState = tileAnimationState.get(x, y);
      if (tileState.selected) {
        selectedCount++;
      }
    });

    // Second pass: draw tiles and track bounds
    tiles.forEach((value, x, y) => {
      const tileState = tileAnimationState.get(x, y);

      ctx.fillStyle = level.colorScheme.cells[value].fill;

      this.draw_tile(
        ctx,
        level.colorScheme,
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
      // get DPI
      const dpi = window.devicePixelRatio;
      const borderWidth = this.getBorderWidth(
        width - padding,
        height - padding
      );
      ctx.lineWidth = borderWidth*dpi;

      if (selectedTiles.length === 1) {
        // Single tile selected - draw dashed border around that tile
        const tile = selectedTiles[0];
        const tileX = tile.x * width + padding;
        const tileY = tile.y * height + padding;
        const tileWidth = width - padding;
        const tileHeight = height - padding;

        // Make dash pattern proportional to border width
        const dashLength = Math.max(3, Math.floor(borderWidth * 2))*dpi;
        ctx.setLineDash([dashLength, dashLength]); // Create dashed line
        ctx.strokeRect(tileX, tileY, tileWidth, tileHeight);
        ctx.setLineDash([]); // Reset to solid line
      } else {
        // Multiple tiles selected - draw solid border around entire selection
        ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
      }
    }
  }

  /**
   * Draws the expanded view of the grid with inset squares.
   * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
   * @param {BoundedGrid} tiles - Grid of tile values
   * @param {BoundedGrid} tileStates - Grid of tile state objects
   * @param {Object} colorScheme - Color scheme object with cells array
   * @param {function} changeFunction - Function to transform tile value
   */
  draw_expanded(ctx, tiles, tileStates, colorScheme, changeFunction) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const { width, height, padding } = this._calculateTileDimensions(
      ctx.canvas.width,
      ctx.canvas.height,
      tiles.width,
      tiles.height
    );

    tiles.forEach((value, x, y) => {
      const tileState = tileStates.get(x, y);

      ctx.fillStyle = colorScheme.cells[value].fill;
      ctx.fillRect(
        x * width + padding,
        y * height + padding,
        width - padding,
        height - padding
      );

      if (ENABLE_INSET_DRAWING) {
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
      }
    });
  }
}

export const squareTileShape = new SquareTileShape();
