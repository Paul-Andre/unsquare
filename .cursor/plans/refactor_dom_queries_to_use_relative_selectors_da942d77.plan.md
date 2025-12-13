---
name: Refactor DOM queries to use relative selectors
overview: Refactor all global DOM selectors (document.getElementById, document.querySelector) to use relative queries from root elements passed to or stored in classes. This will make the code more modular and testable.
todos:
  - id: refactor-bookmenu
    content: Refactor BookMenu to accept root HTMLElement instead of using document.getElementById in constructor
    status: pending
  - id: refactor-levelmenucomponent
    content: Refactor LevelMenuComponent to accept root HTMLElement and update JSON textarea to use relative queries
    status: pending
  - id: refactor-gamebase
    content: Refactor GameBase constructor to accept canvas and div HTMLElements instead of IDs
    status: pending
  - id: refactor-gamelevelmenu
    content: Refactor GameLevelMenu to accept root HTMLElement and homeScreen element instead of using global selectors
    status: pending
    dependencies:
      - refactor-levelmenucomponent
  - id: refactor-screenmanager
    content: Refactor ScreenManager to accept optional root element and use relative queries for screen lookups
    status: pending
  - id: refactor-editorlevelmenu
    content: Update editorLevelMenu.ts to query element and pass to LevelMenuComponent constructor
    status: pending
    dependencies:
      - refactor-levelmenucomponent
  - id: update-main-ts
    content: Update main.ts to query all root elements and pass them to constructors, removing global selectors
    status: pending
    dependencies:
      - refactor-bookmenu
      - refactor-gamelevelmenu
      - refactor-screenmanager
      - refactor-gamebase
  - id: update-game-editor
    content: Update Game.ts and Editor.ts constructors to pass HTMLElements instead of IDs to GameBase
    status: pending
    dependencies:
      - refactor-gamebase
---

# Refactor DOM Queries to Use Relative Selectors

## Overview

Replace all global DOM selectors (`document.getElementById`, `document.querySelector`) with relative queries scoped to root elements. Root elements will be passed as constructor parameters or stored as class properties.

## Files to Modify

### 1. **ScreenManager.ts** - Accept root element or document body

- Currently uses `document.getElementById()` for screen elements
- **Change**: Accept an optional root element in constructor (defaults to `document.body`)
- Store root element as `this.root: HTMLElement`
- Replace all `document.getElementById()` calls with `this.root.querySelector()` or `this.root.getElementById()` (if available) or keep `document.getElementById()` but scope to root's children

### 2. **GameBase.ts** - Already has div, but canvas lookup is global

- Currently uses `document.getElementById(canvasId)` and `document.getElementById(divId)` in constructor
- **Change**: Accept both `canvas` and `div` as HTMLElement parameters instead of IDs
- Update all call sites (Game.ts, Editor.ts) to pass elements instead of IDs

### 3. **GameLevelMenu.ts** - Accept root element

- Currently uses `document.getElementById("gameLevelMenu")` in constructor
- Uses `document.getElementById("home")` in `loadBook()` method
- **Change**: 
- Accept `root: HTMLElement` in constructor instead of hardcoded ID
- Accept `homeScreen: HTMLElement` parameter or find it relative to root
- Update instantiation in `main.ts` to pass the element

### 4. **LevelMenuComponent.ts** - Accept root element, handle JSON textarea

- Currently uses `document.getElementById(elementId)` in constructor
- Uses `document.getElementById("jsonTextareaContainer")` in `showJsonTextarea()`
- **Change**:
- Accept `root: HTMLElement` in constructor instead of `elementId: string`
- For JSON textarea, append to `this.root` or `document.body` (since it's a modal overlay)
- Update all call sites to pass elements

### 5. **BookMenu.ts** - Accept root element

- Currently uses `document.getElementById("bookMenu")` in constructor
- **Change**: Accept `root: HTMLElement` in constructor
- Update instantiation in `main.ts`

### 6. **main.ts** - Pass root elements to constructors

- Currently uses `document.getElementById()` for:
- `opening_instructions` section (line 70)
- `home` screen (line 155)
- **Change**:
- Query elements once at module level
- Pass them to ScreenManager, GameLevelMenu, and other constructors
- For the easter egg setup, pass `homeScreen` element to GameLevelMenu or query it relative to a known root

### 7. **editorLevelMenu.ts** - Update to pass element

- Currently instantiates `LevelMenuComponent` with ID string
- **Change**: Query element first, then pass to constructor

## Implementation Strategy

1. **Start with leaf classes** (classes that don't depend on others):

- `BookMenu` - simple, only used in main.ts
- `LevelMenuComponent` - used by GameLevelMenu and editorLevelMenu

2. **Then update dependent classes**:

- `GameLevelMenu` - depends on LevelMenuComponent
- `GameBase` - base class for Game and Editor

3. **Update ScreenManager**:

- Make it accept root element (defaults to document.body)
- Update all screen lookups to be relative

4. **Finally update main.ts**:

- Query all root elements at module level
- Pass them to constructors
- Update initialization code

## Special Cases

- **JSON textarea in LevelMenuComponent**: This creates a modal overlay. Since it's positioned fixed and overlays the entire page, it's acceptable to append to `document.body`, but we should still scope the query for existing instances to `document.body` rather than global `document.getElementById()`.

- **ScreenManager screen lookups**: Screens are top-level sections. We can either:
- Keep using `document.getElementById()` but ensure all screens are children of a root container
- Or pass a root container that contains all screens

- **GameBase canvas/div**: These are already stored as `this.canvas` and `this.div`, so queries within GameBase/Game/Editor that use `this.div.querySelector()` are already relative. Only the constructor needs updating.

## Testing Considerations

- Ensure all screens still switch correctly
- Verify game canvas and UI elements still work
- Check that level menus display correctly
- Confirm editor functionality remains intact