import { Level } from '../core/Level.js';
import { screenManager } from '../ui/ScreenManager.js';

export function checkAndOpenCustomLevel(game) {
  let customLevelString = new URLSearchParams(location.search).get("custom");
  if (customLevelString !== null) {
    let customLevel = Level.fromCompact(customLevelString);

    
    customLevel.custom = true;
    game.openLevel(customLevel, {
      levels: [],
      source: customLevelString,
    });
    console.log("Switching to customLevel", customLevel);

    screenManager.switchTo("gameLevelMenu");
    screenManager.switchTo("game");

    return true;
  }
  return false;
}
