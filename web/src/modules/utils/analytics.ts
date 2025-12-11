import { Book } from "modules/core/Book";
import { Level } from "modules/core/Level";

export function getGtagLevelName(level: Level, book: Book) {
  let a =
    "Level_" +
    (level.index + 1) +
    " " +
    book.source +
    " " +
    level.getFullIdentifier() +
    " tag_v1";
  console.log(a);
  return a;
}

export function trackLevelStart(level: Level, book: Book) {
  // Wrapping in setTimeout to minimize issues if an error happens.
  setTimeout(function () {
    if (window.gtag) {
      let name = getGtagLevelName(level, book);
      window.gtag("event", "level_start", {
        level_name: name,
      });
    }
    if (window.posthog && typeof window.posthog.capture === 'function') {
      let name = getGtagLevelName(level, book);
      window.posthog.capture('level_start', {
        level_name: name,
      });
    }
  }, 0);
}
export function trackLevelEnd(level: Level, book: Book) {
  // Wrapping in setTimeout to minimize issues if an error happens.
  setTimeout(function () {
    if (window.gtag) {
      let name = getGtagLevelName(level, book);
      window.gtag("event", "level_end", {
        level_name: name,
        success: true,
      });
    }
    if (window.posthog && typeof window.posthog.capture === 'function') {
      let name = getGtagLevelName(level, book);
      window.posthog.capture('level_end', {
        level_name: name,
        success: true,
      });
    }
  }, 0);
}
