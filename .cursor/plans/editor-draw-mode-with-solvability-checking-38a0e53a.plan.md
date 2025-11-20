<!-- 38a0e53a-8704-4c5e-af08-da38a6da8ae6 85ad0ef2-fd9a-4227-8592-dae87397d8d0 -->
# Add Draw Mode to Editor with Solvability Checking

## Overview

Add a draw mode to the editor that allows direct tile painting for easier level design, with automatic solvability checking using the existing gaussian elimination implementation.

## Implementation Details

### 1. Add Draw Mode Toggle

- Add a "Draw Mode" toggle button in the editor UI (`index.html` around line 310)
- Add `drawMode` boolean property to `Editor` class
- Store draw mode state and update button appearance when toggled

### 2. Modify Editor Mouse Interaction

- Override `doMouseDown`, `doMouseMove`, and `doMouseUp` in `Editor` class to handle draw mode
- In draw mode:
- On mouse down: toggle the clicked tile's value (use `level.colorScheme.resquare()` to flip)
- Store the new color value after toggle
- On mouse drag: continue painting tiles with that same new color (set tiles to match the toggled color)
- Save state to undo list before making changes (only once per mouse down event)
- Update both `this.level.tiles` and `this.gameState.tiles` to keep them in sync
- In normal mode: keep existing move-based behavior

### 3. Implement Solvability Checking

- Use existing `compute_gaussian_solution()` from `Level.js` (line 188) which calls `get_gaussian_solution_for_level()` from `algo.js`
- Check solvability immediately on every tile change in draw mode (no debouncing initially)
- Note: Consider moving to a Web Worker for performance if checking becomes slow on large grids
- Update `updateGui()` to display solvability status in the existing `editorBest` span:
- Show move count + "solvable" (e.g., "5 solvable") if solvable
- Show "unsolvable" if no solution exists

### 4. Sync Level State

- When tiles are modified in draw mode, update `this.level.tiles` directly
- Recompute operations and solution vector after changes
- Ensure `this.gameState.tiles` stays synchronized with `this.level.tiles`

## Files to Modify

- `web/www/modules/game/Editor.js` - Add draw mode logic and solvability checking
- `web/www/index.html` - Add draw mode toggle button in editor UI

## Existing Code to Leverage

- `solve_gaussian()` in `web/www/modules/core/algo.js` (line 285) - gaussian elimination implementation
- `compute_gaussian_solution()` in `web/www/modules/core/Level.js` (line 188) - wrapper for solvability checking
- `get_gaussian_solution_for_level()` in `web/www/modules/core/algo.js` (line 430) - level-specific solvability check
- Grid `set()` method for direct tile modification
- `level.colorScheme.resquare()` for toggling tile values

### To-dos

- [ ] Add draw mode toggle button to editor UI in index.html and add drawMode property to Editor class
- [ ] Override mouse event handlers in Editor to support direct tile toggling in draw mode
- [ ] Implement debounced solvability checking using compute_gaussian_solution() and update GUI display
- [ ] Ensure level.tiles and gameState.tiles stay synchronized when tiles are modified in draw mode