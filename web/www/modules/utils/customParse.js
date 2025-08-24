export function parseCustomLevel() {
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
