import { Level } from '../core/Level.ts';
import { Game } from '../game/Game.ts';
import { screenManager } from './ScreenManager.ts';

export function checkAndOpenCustomLevel(game: Game): boolean {
  let customLevelString = new URLSearchParams(location.search).get("custom");
  if (customLevelString !== null) {
    let customLevel = Level.fromCompact(customLevelString);
    if (customLevel === null) {
      return false;
    }

    customLevel.isCustom = true;
    game.openLevel(customLevel, {
      levels: [customLevel],
      source: customLevelString,
      id: "custom",
      title: "Custom",
    });
    console.log("Switching to customLevel", customLevel);

    screenManager.switchTo("gameLevelMenu");
    screenManager.switchTo("game");

    return true;
  }
  return false;
}
