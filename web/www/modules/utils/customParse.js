import { Level } from '../core/Level.js';
import { screenManager } from '../ui/ScreenManager.js';

export function parseCustomLevel(game) {
  let customLevelString = new URLSearchParams(location.search).get("custom");
  if (customLevelString !== null) {
    let customLevel = Level.fromCompact(customLevelString);
    customLevel.custom = true;
    game.openLevel(customLevel, {
      levels: [],
      source: customLevelString,
    });
    screenManager.switchTo("game");
  }
}
