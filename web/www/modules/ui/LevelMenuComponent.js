"use strict";

import { drawIcon } from './icon.js';
import { htmlStringToElement } from '../utils/helpers.js';
import { vector_sum } from '../core/algo.js';
import { screenManager } from './ScreenManager.js';

// Level state constants to replace magic numbers
export const LEVEL_STATES = {
  HIDDEN: 0, // not visible at all
  LOCKED: 1, // visible but not playable
  UNSOLVED: 2, // playable, not yet solved
  SUBOPTIMAL: 3, // solved, but not in optimal moves
  OPTIMAL: 4, // solved in optimal moves
};

// TODO: move these to a different file
export function createLevelIcon(level) {
  return createLevelIconCanvas(level);
}

export function createLevelIconCanvas(level) {
  const icon = document.createElement("canvas");
  icon.style.width = "55px";
  icon.style.height = "55px";
  icon.width = 55 * window.devicePixelRatio;
  icon.height = 55 * window.devicePixelRatio;
  drawIcon(level, icon);
  return icon;
}

/**
 * Calculates the state of each level in the book for the level menu, using fixed parameters for how many unsolved and locked levels are allowed to be visible.
 *
 * States:
 *   LEVEL_STATES.HIDDEN (0) - hidden (not visible at all)
 *   LEVEL_STATES.LOCKED (1) - locked (visible but not playable)
 *   LEVEL_STATES.UNSOLVED (2) - unsolved (playable, not yet solved)
 *   LEVEL_STATES.SUBOPTIMAL (3) - suboptimal (solved, but not in optimal moves)
 *   LEVEL_STATES.OPTIMAL (4) - optimal (solved in optimal moves)
 *
 * Parameters:
 *   book            - The book object containing levels.
 *   allowedUnsolved - The maximum number of unsolved (but playable) levels to show.
 *   allowedLocked   - The maximum number of locked (but visible) levels to show.
 *
 * The function iterates through each level and assigns a state based on the player's progress:
 *   - If the level is unsolved and allowedUnsolved > 0, it is marked as unsolved and allowedUnsolved is decremented.
 *   - If the level is unsolved but allowedUnsolved is 0 and allowedLocked > 0, it is marked as locked and allowedLocked is decremented.
 *   - If neither unsolved nor locked slots are available, the level is hidden.
 *   - If the level is solved suboptimally, it is marked as suboptimal.
 *   - If the level is solved optimally, it is marked as optimal.
 *
 * Returns an array of states for each level.
 */
export function calculateStatesWithParams(book, allowedUnsolved, allowedLocked) {
  let states = [];
  for (let i = 0; i < book.levels.length; i++) {
    let level = book.levels[i];
    let par = level.par;
    let best = level.getBestNumMoves();
    if (best === null) {
      if (allowedUnsolved) {
        states[i] = LEVEL_STATES.UNSOLVED;
        allowedUnsolved -= 1;
      } else if (allowedLocked) {
        states[i] = LEVEL_STATES.LOCKED;
        allowedLocked -= 1;
      } else {
        states[i] = LEVEL_STATES.HIDDEN;
      }
    } else if (best > par) {
      states[i] = LEVEL_STATES.SUBOPTIMAL;
    } else {
      states[i] = LEVEL_STATES.OPTIMAL;
    }
  }
  return states;
}

// Calculates the state of each level in the book for the level menu, using a proportional unlocking system.
// - Starts with a fixed number of unsolved levels allowed to be visible (allowedUnsolved = 3).
// - As the player solves levels suboptimally or optimally, allowedUnsolved increases by a small amount (suboptimalIncrease or optimalIncrease).
// - Levels are marked as:
//   LEVEL_STATES.HIDDEN (0): hidden (not visible at all)
//   LEVEL_STATES.LOCKED (1): locked (visible but not playable)
//   LEVEL_STATES.UNSOLVED (2): unsolved (playable, not yet solved)
//   LEVEL_STATES.SUBOPTIMAL (3): suboptimal (solved, but not in optimal moves)
//   LEVEL_STATES.OPTIMAL (4): optimal (solved in optimal moves)
// - Up to 50 locked levels are allowed to be visible.
export function calculateStatesProportional(book) {
  let allowedUnsolved = 3;
  const suboptimalIncrease = 0.2;
  const optimalIncrease = 0.5;

  let allowedLocked = 50;

  let states = [];
  for (let i = 0; i < book.levels.length; i++) {
    let level = book.levels[i];
    let par = level.par;
    let best = level.getBestNumMoves();
    if (best === null) {
      if (allowedUnsolved > 0) {
        states[i] = LEVEL_STATES.UNSOLVED; // unsolved and playable
        allowedUnsolved -= 1;
      } else if (allowedLocked) {
        states[i] = LEVEL_STATES.LOCKED; // locked but visible
        allowedLocked -= 1;
      } else {
        states[i] = LEVEL_STATES.HIDDEN; // hidden
      }
    } else if (best > par) {
      states[i] = LEVEL_STATES.SUBOPTIMAL; // solved suboptimally
      allowedUnsolved += suboptimalIncrease;
    } else {
      states[i] = LEVEL_STATES.OPTIMAL; // solved optimally
      allowedUnsolved += optimalIncrease;
    }
  }
  return states;
}

export function calculateStates(book) {
  if (book.levels.length == 0) {
    return [];
  }
  // There's two modes: the first one just shows the first level, forcing
  // if (book.levels[0].getBestNumMoves() === null) {
  //   return calculateStatesWithParams(book, 1, 50);
  // } else {
  //   return calculateStatesProportional(book);
  // }

  // Just unlock all...
  return calculateStatesWithParams(book, 100000, 50);
}

// This component manages a level menu DOM element, populating it with level data and handling user interactions.
// It encapsulates the functionality for displaying and interacting with a collection of puzzle levels.
export class LevelMenuComponent {
  constructor(elementId, isEditor) {
    this.elementId = elementId;
    this.isEditor = isEditor;
    this.container = document.querySelector("#" + elementId + " .content");

    // TODO: turn it into a single state variable
    this.deleting = false;
    this.selectingIcon = false;

    this.onIconClick = this.onIconClick.bind(this);
  }

  openBook(book) {
    this.book = book;
  }

  // TODO: rename; this creates an html node
  createLevelInfo(level, state, glow) {
    let element = htmlStringToElement(`<div class="level_icon">
    <canvas class="level_icon_image"> </canvas>
    <div class="level_icon_par"> </div>
    </div>
    `);

    let icon = element.querySelector(".level_icon_image");
    icon.style.width = "55px";
    icon.style.height = "55px";
    icon.width = 55 * window.devicePixelRatio;
    icon.height = 55 * window.devicePixelRatio;
    drawIcon(level, icon);

    element.level = level;

    if (this.isEditor || state >= 2) {
      element.onclick = this.onIconClick.bind(this);
    }

    if (this.isEditor) {
      let par_display = element.querySelector(".level_icon_par");
      par_display.innerText = vector_sum(level.solutionVector);

      if (level.isIcon) {
        element.classList.add("bookIconRepresentative");
      }
    } else {
      let stateClass = {
        [LEVEL_STATES.HIDDEN]: "icon_hidden",
        [LEVEL_STATES.LOCKED]: "icon_locked",
        [LEVEL_STATES.UNSOLVED]: "icon_unsolved",
        [LEVEL_STATES.SUBOPTIMAL]: "icon_suboptimal",
        [LEVEL_STATES.OPTIMAL]: "icon_optimal",
      }[state];

      element.classList.add(stateClass);
      if (glow) {
        element.classList.add("icon_glow");
      }
    }

    return element;
    // TODO: add classes based on
  }

  // this function is to be called on icons using the onclick event
  // now "this" refers to the LevelMenuComponent instance due to bind()
  onIconClick(event) {
    const iconElement = event.target.closest(".level_icon"); // Get the icon element

    if (this.deleting) {
      iconElement.remove();
      this.saveIconOrder();
    } else if (this.selectingIcon) {
      this.book.levels.forEach(function (a) {
        a.isIcon = false;
      });
      iconElement.level.isIcon = true;

      this.toggleSelectIcon();
      this.displayIcons();
      this.saveBook();
    } else {
      //let levelObject = Level.fromJsonObject(iconElement.level);

      if (this.isEditor) {
        //editor.setBook(this.book);

        // TODO: some kind of callback in order to nicely set level data?
        editor.openLevel(iconElement.level, this.book);
        screenManager.switchTo("editor");
      } else {
        console.log("Attempting to open level:", iconElement.level);
        console.log("Game object:", game);
        console.log("Window.game object:", window.game);
        console.log("Game.openLevel method:", game?.openLevel);
        console.log("Window.game.openLevel method:", window.game?.openLevel);
        if (window.game && window.game.openLevel) {
          window.game.openLevel(iconElement.level, this.book);
          screenManager.switchTo("game");
        } else {
          console.error("Game or game.openLevel is not available!");
        }
      }
    }
  }

  reindexLevels() {
    for (let i = 0; i < this.book.levels.length; i++) {
      let level = this.book.levels[i];
      level.index = i;
    }
  }

  displayIcons() {
    this.container.innerHTML = "";

    let states;
    if (!this.isEditor) {
      states = calculateStates(this.book);
    }

    for (let i = 0; i < this.book.levels.length; i++) {
      let level = this.book.levels[i];
      let glow = !this.isEditor && i == 0 && states[i] == LEVEL_STATES.UNSOLVED;
      // check par, and based on it figure out the restriction level.
      this.container.appendChild(
        this.createLevelInfo(
          level,
          this.isEditor ? LEVEL_STATES.UNSOLVED : states[i],
          glow
        )
      );
    }
  }

  saveBook() {
    if (this.isEditor) {
      save_editor_book(this.book);
    }
  }

  saveIconOrder() {
    if (this.isEditor) {
      this.book.levels = Array.prototype.map.call(
        this.container.children,
        function (child) {
          return child.level;
        }
      );
      this.reindexLevels();
      this.saveBook();
    }
  }

  newLevel() {
    if (this.isEditor) {
      const level = Level.empty(6);
      level.book = this.book;
      this.book.levels.push(level);
      this.displayIcons();
      this.reindexLevels();
      this.saveBook();
    }
  }

  async displayBookJson() {
    if (this.isEditor) {
      let s = JSON.stringify(this.book, book_replacer);
      await navigator.clipboard.writeText(s);
      alert("Saved to clipboard");
    }
  }

  toggleDelete() {
    if (this.isEditor) {
      // toggle the deleting state
      this.deleting = this.deleting == false;
      this.container.classList.toggle("deleting");
    }
  }

  toggleSelectIcon() {
    if (this.isEditor) {
      // toggle the selecting icon state
      this.selectingIcon = this.selectingIcon == false;
      this.container.classList.toggle("selectingIcon");
    }
  }

  changeBookTitle() {
    let new_title = prompt("Set book title", this.book.title);

    if (new_title) {
      this.book.title = new_title;
    }
    save_editor_book(this.book);
  }

  // TODO: put this in "subclass"
  clearAllBests() {
    for (let i = 0; i < this.book.levels.length; i++) {
      gameLevelMenuInstance.clearBestNumMoves(this.book.levels[i]);
    }
    this.displayIcons();
  }

  get onShow() {
    return this.displayIcons.bind(this);
  }
}

// Factory function for backward compatibility
