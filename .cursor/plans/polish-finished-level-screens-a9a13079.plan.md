<!-- a9a13079-517d-4156-9e73-d958a15dcd54 c245599b-a17c-4bf4-b47c-fbb81b41cc07 -->
# Polish Finished Level Screens

## Current State

- Duplicate `finishedLevel` divs exist in HTML (lines 210-222 and 224-236)
- Unused `finishedLevelSolved` div exists (lines 238-246)
- `finishedLevelPerfect` is missing the proper structure (no `finishedLevelInside` wrapper, no h1/h2 content)
- Both screens have hardcoded "40/3 moves" instead of dynamic values
- Perfect screen says "Complete!" instead of "Perfect!"
- Game.js only hides `finishedLevel`, not `finishedLevelPerfect`
- CSS styling needed for `finishedLevelPerfect`

## Changes Needed

### 1. Clean up HTML (`web/www/index.html`)

- Remove duplicate `finishedLevel` div (lines 224-236)
- Remove unused `finishedLevelSolved` div (lines 238-246)
- Update `finishedLevelPerfect` to match `finishedLevel` structure:
- Add `finishedLevelInside` wrapper div
- Add h1 with "Perfect!" text
- Add h2 with dynamic moves display (placeholder for now, will be updated via JS)
- Keep the Next button

### 2. Update JavaScript (`web/www/modules/game/GameBase.js`)

- After showing the finished level screen, update the h2 text to show actual moves/par (e.g., "5/3 moves")
- Apply to both `finishedLevel` and `finishedLevelPerfect`

### 3. Update Game.js (`web/www/modules/game/Game.js`)

- Update `onMouseDown()` to also hide `finishedLevelPerfect`
- Update `displayLevelGui()` to also hide `finishedLevelPerfect`

### 4. Update CSS (`web/www/style3.css`)

- Add styles for `finishedLevelPerfect` (should share base styles with `finishedLevel`)
- Ensure `.finishedLevelPerfect.showing` animation works
- Style the h1 and h2 elements appropriately

### To-dos

- [ ] Remove duplicate finishedLevel div and unused finishedLevelSolved div, update finishedLevelPerfect structure
- [ ] Add JavaScript to dynamically update moves/par display in both finished level screens
- [ ] Update Game.js to properly hide finishedLevelPerfect in onMouseDown and displayLevelGui
- [ ] Add CSS styling for finishedLevelPerfect to match finishedLevel styling