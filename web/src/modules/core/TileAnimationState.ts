"use strict";

import { BoundedGrid, Grid, GridWindow } from './Grid';

interface TileState {
  selected: boolean;
  oldSelected: boolean;
  insetState: number;
  reverseInsetState: number;
  transitionState: number;
}

export class TileAnimationState {
  grid: BoundedGrid<TileState>;

  constructor(tiles: BoundedGrid<number>) {
    // Create a grid with the same dimensions as tiles
    // Each cell contains animation state object
    this.grid = tiles.map<TileState>((v) => ({
      selected: false,
      oldSelected: false,
      insetState: 0,
      reverseInsetState: 1,
      transitionState: 1,
    }));
  }

  get(x: number, y: number): TileState {
    return this.grid.get(x, y);
  }

  forEach(callback: (ts: TileState, x: number, y: number) => void): void {
    this.grid.forEach(callback);
  }

  reset(): void {
      this.forEach((ts, x, y) => {
      ts.selected = false;
      ts.oldSelected = false;
      ts.insetState = 0;
      ts.reverseInsetState = 1;
      ts.transitionState = 1;
    });
  }

  clone(): TileAnimationState {
    // TODO: This is a hack to create a new grid with the same dimensions as the original grid
    const cloned = new TileAnimationState(Grid.fill<number>(this.grid.width, this.grid.height, 0));
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

  get width(): number {
    return this.grid.width;
  }

  get height(): number {
    return this.grid.height;
  }

  window(x: number, y: number, w: number, h: number): GridWindow<TileState> {
    return this.grid.window(x, y, w, h);
  }
}

