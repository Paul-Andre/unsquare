"use strict";

import { Grid } from './Grid';

export class TileAnimationState {
  constructor(tiles) {
    // Create a grid with the same dimensions as tiles
    // Each cell contains animation state object
    const tileStates = tiles.clone();
    tileStates.forEachSet(function () {
      return {
        selected: false,
        oldSelected: false,
        insetState: 0,
        reverseInsetState: 1,
        transitionState: 1,
      };
    });
    this.grid = tileStates;
  }

  get(x, y) {
    return this.grid.get(x, y);
  }

  forEach(callback) {
    this.grid.forEach(callback);
  }

  reset() {
    this.forEach(function (ts) {
      ts.selected = false;
      ts.oldSelected = false;
      ts.insetState = 0;
      ts.reverseInsetState = 1;
      ts.transitionState = 1;
    });
  }

  clone() {
    const cloned = new TileAnimationState(Grid.empty(this.grid.width, this.grid.height));
    this.forEach(function (ts, x, y) {
      cloned.grid.set(x, y, {
        selected: ts.selected,
        oldSelected: ts.oldSelected,
        insetState: ts.insetState,
        reverseInsetState: ts.reverseInsetState,
        transitionState: ts.transitionState,
      });
    });
    return cloned;
  }

  get width() {
    return this.grid.width;
  }

  get height() {
    return this.grid.height;
  }

  window(x, y, w, h) {
    return this.grid.window(x, y, w, h);
  }
}

