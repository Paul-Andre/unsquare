<!-- 03efb1f3-ed3f-4e01-82d8-2de46a933f19 018f037f-c294-4097-a67e-fac61532032a -->
# Convert Canvas Icons to IMG Tags with Data URLs

## Overview

Currently, level icons are rendered as `<canvas>` elements. We'll convert them to `<img>` tags with data URLs by drawing on a temporary canvas, converting it to a data URL, and setting that as the img src.

## Changes Required

### 1. Update `icon.js`

- Modify `createLevelIcon()` to return an `<img>` element instead of a canvas
- Keep `createLevelIconCanvas()` as a helper function (used internally)
- After drawing on canvas, convert to data URL using `canvas.toDataURL()`
- Create img element and set its src to the data URL
- Preserve the same styling (55px width/height)

### 2. Update `LevelMenuComponent.js`

- Modify `createLevelInfo()` method to create an `<img>` tag instead of `<canvas>` in the HTML template
- Change the selector from `.level_icon_image` canvas to img
- Draw icon on a temporary canvas, convert to data URL, then set as img src
- Update the class name in the template from `canvas` to `img` (or keep as-is if CSS works for both)

### 3. CSS Compatibility

- Verify `.level_icon_image` styles work with img tags (should be compatible based on current CSS)

## Implementation Details

**Files to modify:**

- `web/www/modules/ui/icon.js` - Update `createLevelIcon()` function
- `web/www/modules/ui/LevelMenuComponent.js` - Update `createLevelInfo()` method

**Key changes:**

- Use `canvas.toDataURL()` to convert canvas content to data URL
- Replace canvas element creation with img element creation
- Set img `src` attribute to the data URL
- Maintain same dimensions and styling

### To-dos

- [ ] Modify createLevelIcon() in icon.js to return img element with data URL instead of canvas
- [ ] Modify createLevelInfo() in LevelMenuComponent.js to use img tag instead of canvas in HTML template and convert canvas to data URL