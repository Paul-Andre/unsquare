<!-- eed82e06-ba13-427f-88e4-3c731ab1a11f 7a86dcc1-eee3-4342-95e7-72b1ea7ffb49 -->
# Method Ownership Analysis for GameBase, Game, and Editor

## Analysis Framework

- **GameBase**: Core infrastructure shared by both Game and Editor (canvas, input, drawing, animation)
- **Game**: Gameplay-specific logic (win conditions, scoring, level navigation, hints)
- **Editor**: Editor-specific logic (level creation, undo, solution submission)

## Method-by-Method Analysis

### GameBase Methods

#### Should STAY in GameBase (Core Infrastructure)

1. **constructor** - Base initialization (canvas, context, event listeners)
2. **onResize** - Canvas sizing (shared by both)
3. **openLevel** - Base level loading (but should call abstract `displayLevelGui`)
4. **doMouseDown** - Core input handling
5. **doMouseMove** - Core input handling
6. **doMouseUp** - Core input handling
7. **handleMouseEnter** - Core input handling
8. **handleMouseLeave** - Core input handling
9. **handleMouseMove** - Core input handling
10. **getCoordinates** - Input utility (shared)
11. **setupEventListeners** - Event setup (shared)
12. **draw** - Drawing orchestration (shared)
13. **actuallyDrawCanvas** - Core canvas drawing (shared)
14. **forceRedraw** - Drawing utility (shared) - NOTE: Currently defined twice (lines 520 and 708)!
15. **startAnimationLoopIfNeeded** - Animation infrastructure (shared)
16. **hasAnimations** - Animation infrastructure (shared)
17. **updateCanvasAnimations** - Animation infrastructure (shared)
18. **drawCanvas** - Animation loop (shared)
19. **onShow** - Lifecycle hook (shared)
20. **onHide** - Lifecycle hook (shared)
21. **postMove** - Hook method (empty, overridden)
22. **onMouseDown** - Hook method (empty, overridden)
23. **preMove** - Hook method (empty, overridden)

#### Should MOVE to Game (Game-Specific Logic)

1. **displayLevelGui** - Currently empty in base, only Game implements it. Contains:

- Finished level UI elements
- Level text, par, index display
- Next/prev button state
- All Game-specific UI

2. **isInBasicBook** - Only used in Game's updateGui for hint logic

3. **updateGui** - Contains Game-specific logic:

- Demo drag hints (tutorial system)
- Restart button suggestions
- Finished level UI (finishedLevel, finishedLevelPerfect, finishedGame)
- Moves display
- Best moves display (calls getCurrentBest)
- All references Game-specific DOM elements

4. **overlayDemoDrag** - Tutorial hint system (only used by Game)

- References `this.demoDrag` which is Game-specific
- Uses `firstDemoDrag` which is Game-specific

5. **interpolate, bezierBlend, clamp, easeOut, dragBlend** - Animation utilities

- Currently only used by `overlayDemoDrag` (Game-specific)
- Could stay in base if Editor might need them, but currently only Game uses

### Game Methods

#### Should STAY in Game (All are Game-specific)

1. **constructor** - Game initialization
2. **action** - Game action (unsquare)
3. **onMouseDown** - Hide finished level UI
4. **postMove** - Check win condition
5. **restart** - Game restart logic
6. **isFinished** - Win condition check
7. **finishedLevel** - Level completion logic
8. **getCurrentBest** - Score tracking
9. **displayLevelGui** - Game UI display
10. **undo** - Game undo (uses GameState.undo)
11. **checkShowOverlay** - Discord overlay logic
12. **nextLevel** - Level navigation
13. **prevLevel** - Level navigation

### Editor Methods

#### Should STAY in Editor (All are Editor-specific)

1. **constructor** - Editor initialization
2. **editorOpenLevel** - Editor-specific level loading (clones level)
3. **action** - Editor action (resquare)
4. **preMove** - Editor undo system
5. **updateLevelInfo** - Sync level with gameState
6. **saveLevel** - Save edited level
7. **restoreUndoState** - Editor undo
8. **createUndoState** - Editor undo (unused?)
9. **undo** - Editor undo (different from Game)
10. **submitSolution** - Solution submission
11. **submitCompact** - Compact level submission
12. **postApplyMove** - Update solution type
13. **clear** - Clear level
14. **play** - Switch to game mode
15. **specificOnShow** - Editor-specific show logic
16. **promptSize** - Resize level
17. **saveAndReturn** - Save and navigate
18. **setText** - Set level text
19. **printFlat** - Debug output
20. **updateGui** - Editor UI display (different from Game)
21. **getCustomUrl** - Share URL generation
22. **displayShare** - Share dialog

## Summary of Moves Needed

### From GameBase → Game:

1. `displayLevelGui()` - Move implementation from Game to Game, remove empty stub from GameBase
2. `isInBasicBook()` - Only used by Game
3. `updateGui()` - Contains all Game-specific UI logic
4. `overlayDemoDrag()` - Tutorial hint system
5. `interpolate()`, `bezierBlend()`, `clamp()`, `easeOut()`, `dragBlend()` - Animation utilities (only used by overlayDemoDrag)

### Properties to Move from GameBase → Game:

- `demoDrag` - Tutorial hint system
- `demoDragTime` - Tutorial hint animation
- `firstDemoDrag` - Tutorial hint configuration

### Issues to Fix:

1. **Duplicate `forceRedraw()`** - Defined at lines 520 and 708 in GameBase (different implementations!)
2. **`openLevel()` in GameBase** - Calls `displayLevelGui()` which should be abstract/hook
3. **`updateGui()` in GameBase** - Calls `getCurrentBest()` which doesn't exist in base (only in Game)
4. **`draw()` in GameBase** - Calls `updateGui()` which will be Game-specific

## Implementation Notes

After moving methods:

- GameBase's `openLevel()` should call `this.displayLevelGui(level)` as a hook (subclasses implement)
- GameBase's `draw()` should call `this.updateGui()` as a hook (subclasses implement)
- GameBase's `actuallyDrawCanvas()` should conditionally call `overlayDemoDrag()` only if it exists, or Game should override `actuallyDrawCanvas()` to add the overlay
- Editor already overrides `updateGui()`, so that's fine
- Need to ensure `getCurrentBest()` is only called from Game's `updateGui()`

## Low-Hanging Simplifications (Do Before Major Refactor)

These are quick fixes that can be done immediately without affecting the major refactor:

### 1. Fix Duplicate `forceRedraw()` Method (CRITICAL BUG)

- **Location**: GameBase.js lines 520 and 708
- **Issue**: Two different implementations of the same method
- Line 520: Updates inset states before drawing, checks `hidden`
- Line 708: Simpler version, doesn't update inset states, doesn't check `hidden`
- **Fix**: Remove the duplicate at line 708, keep the more complete version at line 520
- **Impact**: Currently the second definition overrides the first, so inset states aren't updated in some cases

### 2. Remove Dead Code in `setupEventListeners()`

- **Location**: GameBase.js line 284
- **Issue**: `if (false)` block contains old touch/mouse event handling code that's never executed
- **Fix**: Delete the entire `if (false) { ... }` block (lines 284-327)
- **Impact**: Reduces code size, removes confusion

### 3. Remove Debug Console.log Statements

- **Locations**:
- GameBase.js line 330: `console.log("begin", e)`
- GameBase.js line 344: `console.log("asdfasd")`
- Game.js line 91: `console.log(this.gameState.runningSolution)`
- Editor.js line 94: `console.log(sol)`
- Editor.js line 202: `console.log(grid)`
- Editor.js line 246: `console.log(ret)`
- **Fix**: Remove all console.log statements (or convert to proper logging if needed)
- **Impact**: Cleaner code, no debug noise in console

### 4. Fix Missing Import in Editor.js

- **Location**: Editor.js line 180
- **Issue**: Uses `vector_equal()` but doesn't import it from `../core/algo.js`
- **Fix**: Add `vector_equal` to the import statement on line 6
- **Impact**: Currently would cause runtime error when `specificOnShow()` is called

### 5. Remove Unused Properties/Methods

- **Location**: GameBase.js line 53
- **Issue**: `this.wasPaused = true` is set but never used
- **Fix**: Remove the property initialization
- **Impact**: Cleaner code

- **Location**: Editor.js lines 65-77
- **Issue**: `restoreUndoState()` and `createUndoState()` methods are defined but never called
- **Fix**: Remove if truly unused, or verify they should be used
- **Impact**: Reduces dead code

### 6. Remove Commented-Out Code

- **Location**: GameBase.js line 337
- **Issue**: `// console.log("slide", e)` - commented debug code
- **Fix**: Remove commented line
- **Impact**: Cleaner code

### 7. Fix Inconsistent Error Handling

- **Location**: GameBase.js line 333
- **Issue**: `return cancelEvent(event);` but `event` is not defined (should be `e`)
- **Fix**: Change to `return cancelEvent(e);`
- **Impact**: Potential bug if that code path is ever executed

### Summary of Quick Wins:

1. ✅ Fix duplicate `forceRedraw()` (bug fix)
2. ✅ Remove dead `if (false)` block (cleanup)
3. ✅ Remove console.log statements (cleanup)
4. ✅ Add missing `vector_equal` import (bug fix)
5. ✅ Remove unused `wasPaused` property (cleanup)
6. ✅ Remove unused methods in Editor (cleanup)
7. ✅ Fix undefined `event` variable (bug fix)

**Estimated time**: 15-30 minutes
**Risk**: Very low - these are all safe cleanup/bug fixes