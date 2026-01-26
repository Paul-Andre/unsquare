import { Level } from '../core/Level.ts';
import { appContext } from '../core/AppContext.ts';
import { getUrlContinuations } from 'modules/core/Continuation.ts';
import { processContinuations } from 'modules/core/processContinuations.ts';
import { reindexLevels } from 'modules/core/bookUtils.ts';
import { Book } from 'modules/core/Book.ts';

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

function getUrlCustomLevel(): Level | null {
  let customLevelString = new URLSearchParams(location.search).get("custom");
  if (customLevelString !== null) {
    let level = Level.fromCompact(customLevelString);
    if (level !== null) {
      level.isCustom = true;
      return level;
    }
  }
  return null; 
}

function getUrlCustomLevelBook(): Book | null {
  let customLevel = getUrlCustomLevel();
  if (customLevel !== null) {
    let book = {
      levels: [customLevel],
      source: "custom",
      id: "custom",
      title: "Custom",
    };
    reindexLevels(book.levels);
    return book;
  }
  return null;
}

function hasUserExperience(): boolean {
  let num_levels_done = 0;
  for (let key in localStorage) {
    if (key.endsWith("bestNumMoves")) {
      num_levels_done += 1;
    }
  }
  return num_levels_done >= 5;
}


// Initial screen selection based on user experience
export function setupInitialScreen() {
  let continuations = getUrlContinuations();
  let customLevelBook = getUrlCustomLevelBook();
  if (customLevelBook !== null) {
    appContext.screenManager.switchTo("mainLevelMenu");
    appContext.playLevel(customLevelBook.levels[0], customLevelBook);
    processContinuations(continuations);
    return;
  }
  if (continuations.length > 0) {
    processContinuations(continuations);  
    return;
  }
  if (hasUserExperience()) {
    appContext.openingInstructions.hasAlreadyWentToFirstLevel = true;
    appContext.screenManager.switchTo('mainLevelMenu');
  } else {
    appContext.screenManager.switchTo('opening_instructions');
  }
}