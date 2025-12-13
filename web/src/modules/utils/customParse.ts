import { Level } from '../core/Level.ts';
import { Game } from '../game/Game';
import { screenManager } from '../ui/ScreenManager';

export function checkAndOpenCustomLevel(game: Game): boolean {
  let customLevelString = new URLSearchParams(location.search).get("custom");
  if (customLevelString !== null) {
    let customLevel = Level.fromCompact(customLevelString);
    if (customLevel === null) {
      return false;
    }

    customLevel.isCustom = true;
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
