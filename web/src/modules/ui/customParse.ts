import { Level } from '../core/Level.ts';
import { appContext } from '../core/AppContext.ts';

export function checkAndOpenCustomLevel(): boolean {
  let customLevelString = new URLSearchParams(location.search).get("custom");
  if (customLevelString !== null) {
    let customLevel = Level.fromCompact(customLevelString);
    if (customLevel === null) {
      return false;
    }

    customLevel.isCustom = true;
    console.log("Switching to customLevel", customLevel);

    appContext.screenManager.switchTo("mainLevelMenu");
    appContext.playLevel(customLevel, {
      levels: [customLevel],
      source: customLevelString,
      id: "custom",
      title: "Custom",
    });

    return true;
  }
  return false;
}
