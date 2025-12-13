"use strict";
import { assert } from '../utils/helpers.ts';
import { Level } from '../core/Level.ts';
// Pretty self explanatory. It draws the icon for the given level on the canvas.
// It creates a new context and draws the icon such that it covers the whole canvas.

// function square_geometry_foreach(array, w, h, f) {

// }

import { ICON_SIZE } from '../utils/config.ts';

// Cache for level icon dataURLs, keyed by level full identifier
const iconCache = new Map();

/**
 * Get cached icon dataURL for a level, or generate and cache it if not found.
 * @param {Level} level - The level to get the icon dataURL for
 * @returns {string} The dataURL for the level icon
 */
export function getCachedLevelIconDataUrl(level: Level): string {
  const fullIdentifier = level.getFullIdentifier();
  
  if (iconCache.has(fullIdentifier)) {
    return iconCache.get(fullIdentifier);
  }
  
  const dataURL = createLevelIconDataUrl(level, ICON_SIZE);
  iconCache.set(fullIdentifier, dataURL);
  
  return dataURL;
}

/**
 * Create icon dataURL for a level.
 * @param {Level} level - The level
 * @returns {string} The dataURL for the level icon
 */
export function createLevelIconDataUrl(level: Level, size: number): string {
  const canvas = createLevelIconCanvas(level, size);
  return canvas.toDataURL();
}

export function createLevelIconElement(level: Level, size: number = ICON_SIZE): HTMLImageElement {
  // Get cached or generate dataURL
  const dataURL = getCachedLevelIconDataUrl(level);
  
  // Create img element with data URL
  const img = document.createElement("img");
  img.src = dataURL;
  img.style.width = `${size}px`;
  img.style.height = `${size}px`;
  img.className = "level_icon_image";
  
  return img;
}

export function createLevelIconCanvas(level: Level, size: number): HTMLCanvasElement {
  const icon = document.createElement("canvas");
  icon.style.width = `${size}px`;
  icon.style.height = `${size}px`;
  icon.width = size * window.devicePixelRatio;
  icon.height = size * window.devicePixelRatio;
  drawIcon(level, icon);
  return icon;
}

export function drawIcon(level: Level, canvas: HTMLCanvasElement): void {
  if (level.colorScheme) {
    let colorScheme = level.colorScheme;

    let tileShape = level.tileShape;

    let tiles = level.tiles;

    let cellWidth = canvas.width / tiles.width;
    let cellHeight = canvas.height / tiles.height;

    let ctx = canvas.getContext("2d");
    assert(ctx !== null);

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
