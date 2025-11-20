<!-- 1c04f043-a4e2-44c8-a3f5-c6ab95f14df3 d16f01dc-98ac-46db-abc0-84d262bdf404 -->
# Refactor: Move Game-Specific Logic from GameBase to Game

## Overview

Move all Game-specific methods, properties, and logic from `GameBase.js` to `Game.js`, ensuring GameBase only contains shared infrastructure used by both Game and Editor.

## Files to Modify

- `/home/paul/Programming/unsquare/web/www/modules/game/GameBase.js` - Remove Game-specific code
- `/home/paul/Programming/unsquare/web/www/modules/game/Game.js` - Add moved methods

## Methods to Move from GameBase → Game

### 1. `displayLevelGui(level)` 

- **Current**: Empty stub in GameBase (line 73), full implementation in Game (line 131)
- **Action**: Remove stub from GameBase, keep implementation in Game
- **Note**: GameBase's `openLevel()` already calls `this.displayLevelGui()` as a hook, which is correct

### 2. `isInBasicBook()`

- **Current**: GameBase line 328
- **Action**: Move to Game
- **Used by**: Only Game's `updateGui()` logic

### 3. `updateGui()`

- **Current**: GameBase line 333, contains Game-specific UI logic
- **Action**: Move entire implementation to Game
- **Note**: Editor already overrides this method, so removing from base is safe
- **Dependencies**: Calls `isInBasicBook()`, `isFinished()`, `getCurrentBest()` - all Game-specific

### 4. `overlayDemoDrag()`

- **Current**: GameBase line 582
- **Action**: Move to Game
- **Used by**: Only called from `actuallyDrawCanvas()` when `this.demoDrag` exists

### 5. Animation utility methods (only used by `overlayDemoDrag()`)

- `interpolate()` - GameBase line 555
- `bezierBlend()` - GameBase line 561
- `clamp()` - GameBase line 565
- `easeOut()` - GameBase line 569
- `dragBlend()` - GameBase line 573
- **Action**: Move all to Game

## Properties to Move from GameBase → Game

1. `this.demoDrag` - line 31
2. `this.demoDragTime` - line 32
3. `this.firstDemoDrag` - lines 42-51

## Code Updates Required

### GameBase.js Changes

1. **Remove empty `displayLevelGui()` stub** (line 73)

   - Keep the call in `openLevel()` as a hook

2. **Remove `isInBasicBook()` method** (lines 328-331)

3. **Remove `updateGui()` method** (lines 333-424)

   - Editor already overrides this, so safe to remove

4. **Remove animation utility methods** (lines 554-579):

   - `interpolate()`, `bezierBlend()`, `clamp()`, `easeOut()`, `dragBlend()`

5. **Remove `overlayDemoDrag()` method** (lines 581-621)

6. **Remove properties from constructor** (lines 31-32, 42-51):

   - `this.demoDrag = null;`
   - `this.demoDragTime = 0;`
   - `this.firstDemoDrag = { ... }`

7. **Add hook methods to GameBase** (after existing hooks like `postMove()`, `preMove()`, `onMouseDown()`):

   - `hasAdditionalAnimations()` - Hook for subclasses to check for animations beyond tile animations (returns false by default)
   - `updateAdditionalAnimations(timestamp)` - Hook for subclasses to update additional animations (returns false by default)
   - `drawOverlays()` - Hook for subclasses to draw overlays after base canvas drawing (empty by default)

8. **Update `actuallyDrawCanvas()`** (line 447):

   - Remove the `if (this.demoDrag) { this.overlayDemoDrag(); }` block (lines 455-457)
   - Add call to `this.drawOverlays()` at the end

9. **Update `hasAnimations()`** (line 470):

   - Remove `this.demoDrag` check (lines 476-479)
   - After checking tile animations, also check `this.hasAdditionalAnimations()`

10. **Update `updateCanvasAnimations()`** (line 497):

    - Remove `this.demoDrag` and `this.demoDragTime` update logic (lines 500-506)
    - After updating tile animations, also call `this.updateAdditionalAnimations(timestamp)` and include its return value

### Game.js Changes

1. **Add properties to constructor** (after line 18):
   ```javascript
   this.demoDrag = null;
   this.demoDragTime = 0;
   this.firstDemoDrag = {
     start: { x: 0.33, y: 0.33 },
     end: { x: 0.67, y: 0.67 },
   };
   ```

2. **Add `isInBasicBook()` method** (after `getCurrentBest()`)

3. **Move `updateGui()` from GameBase** - replace any existing stub

4. **Add animation utility methods**:

   - `interpolate()`, `bezierBlend()`, `clamp()`, `easeOut()`, `dragBlend()`

5. **Add `overlayDemoDrag()` method**

6. **Implement hook methods**:

   - `hasAdditionalAnimations()` - return `true` if `this.demoDrag` exists
   - `updateAdditionalAnimations(timestamp)` - update `this.demoDragTime` if `this.demoDrag` exists, return `true` if demo drag is active
   - `drawOverlays()` - call `this.overlayDemoDrag()` if `this.demoDrag` exists

## Implementation Order

1. Add all methods and properties to Game.js first
2. Override hook methods in Game.js (`actuallyDrawCanvas`, `hasAnimations`, `updateCanvasAnimations`)
3. Remove methods and properties from GameBase.js
4. Clean up GameBase.js hook calls (they already work correctly)

## Testing Considerations

- Verify Game still shows tutorial hints correctly
- Verify Editor still works (it overrides `updateGui()`)
- Verify animation system works in both Game and Editor
- Verify no runtime errors from missing methods

### To-dos

- [ ] Add demoDrag, demoDragTime, and firstDemoDrag properties to Game constructor
- [ ] Move isInBasicBook() method from GameBase to Game
- [ ] Move updateGui() method from GameBase to Game (Editor already overrides it)
- [ ] Move animation utility methods (interpolate, bezierBlend, clamp, easeOut, dragBlend) from GameBase to Game
- [ ] Move overlayDemoDrag() method from GameBase to Game
- [ ] Override actuallyDrawCanvas() in Game to add demo drag overlay after calling super
- [ ] Override hasAnimations() in Game to include demo drag animation check
- [ ] Override updateCanvasAnimations() in Game to update demo drag animation
- [ ] Remove demoDrag, demoDragTime, and firstDemoDrag properties from GameBase constructor
- [ ] Remove isInBasicBook(), updateGui(), animation utils, and overlayDemoDrag() from GameBase
- [ ] Clean up GameBase hook methods (actuallyDrawCanvas, hasAnimations, updateCanvasAnimations) to remove demo drag references