"use strict";

import { getCachedLevelIconDataUrl } from './icon.ts';
import { assert, cast, htmlStringToElement } from '../utils/helpers.ts';
import { ICON_SIZE } from '../utils/config.ts';
import { vector_sum } from '../core/algo.ts';
import { appContext } from '../core/AppContext.ts';
import { Level } from '../core/Level.ts';
import { save_editor_book, book_reviver } from '../core/bookUtils.ts';
import { book_replacer } from '../core/bookUtils.ts';
import { clearBestNumMoves } from '../core/levelUtils.ts';
import { Book } from 'modules/core/Book.ts';

// Level state constants to replace magic numbers
export const LEVEL_STATES = {
  CONCEALED: 0, // contents of level not visible
  LOCKED: 1, // visible but not playable
  UNSOLVED: 2, // playable, not yet solved
  SUBOPTIMAL: 3, // solved, but not in optimal moves
  OPTIMAL: 4, // solved in optimal moves
};
export type LevelState = typeof LEVEL_STATES[keyof typeof LEVEL_STATES];

/**
 * Calculates the state of each level in the book for the level menu, using fixed parameters for how many unsolved and locked levels are allowed to be visible.
 *
 * States:
 *   LEVEL_STATES.CONCEALED (0) - concealed (not visible at all)
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
 *   - If neither unsolved nor locked slots are available, the level is concealed.
 *   - If the level is solved suboptimally, it is marked as suboptimal.
 *   - If the level is solved optimally, it is marked as optimal.
 *
 * Returns an array of states for each level.
 */
export function calculateStatesWithParams(book: Book, allowedUnsolved: number, allowedLocked: number): LevelState[] {
  let states: LevelState[] = [];
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
        states[i] = LEVEL_STATES.CONCEALED;
      }
    } else if (par === null || best > par) {
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
//   LEVEL_STATES.CONCEALED (0): concealed (not visible at all)
//   LEVEL_STATES.LOCKED (1): locked (visible but not playable)
//   LEVEL_STATES.UNSOLVED (2): unsolved (playable, not yet solved)
//   LEVEL_STATES.SUBOPTIMAL (3): suboptimal (solved, but not in optimal moves)
//   LEVEL_STATES.OPTIMAL (4): optimal (solved in optimal moves)
// - Up to 50 locked levels are allowed to be visible.
export function calculateStatesProportional(book: Book): LevelState[] {
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
        states[i] = LEVEL_STATES.CONCEALED; // concealed
      }
    } else if (par === null || best > par) {
      states[i] = LEVEL_STATES.SUBOPTIMAL; // solved suboptimally
      allowedUnsolved += suboptimalIncrease;
    } else {
      states[i] = LEVEL_STATES.OPTIMAL; // solved optimally
      allowedUnsolved += optimalIncrease;
    }
  }
  return states;
}

export function calculateStates(book: Book): LevelState[] {
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

/**
 * Calculate the state of a single level based on whether it's been solved and how well.
 * Returns UNSOLVED, SUBOPTIMAL, or OPTIMAL (not CONCEALED or LOCKED, which require book context).
 * @param {Level} level - The level to calculate state for
 * @returns {number} One of LEVEL_STATES.UNSOLVED, LEVEL_STATES.SUBOPTIMAL, or LEVEL_STATES.OPTIMAL
 */
export function calculateLevelState(level: Level): LevelState {
  const best = level.getBestNumMoves();
  const par = level.par;
  
  if (best === null) {
    return LEVEL_STATES.UNSOLVED;
  } else if (par === null || best > par) {
    return LEVEL_STATES.SUBOPTIMAL;
  } else {
    return LEVEL_STATES.OPTIMAL;
  }
}

/**
 * Apply the appropriate CSS class to an element based on its level state.
 * Removes all existing state classes before adding the new one.
 * @param {HTMLElement} element - The DOM element to apply the class to
 * @param {number} state - One of the LEVEL_STATES constants
 */
export function applyStateClass(element: HTMLElement, state: LevelState): void {
  // Remove all existing state classes
  element.classList.remove(
    "icon_concealed",
    "icon_locked",
    "icon_unsolved",
    "icon_suboptimal",
    "icon_optimal"
  );

  // Map state to CSS class
  const stateClass = {
    [LEVEL_STATES.CONCEALED]: "icon_concealed",
    [LEVEL_STATES.LOCKED]: "icon_locked",
    [LEVEL_STATES.UNSOLVED]: "icon_unsolved",
    [LEVEL_STATES.SUBOPTIMAL]: "icon_suboptimal",
    [LEVEL_STATES.OPTIMAL]: "icon_optimal",
  }[state];

  if (stateClass) {
    element.classList.add(stateClass);
  }
}

// This component manages a level menu DOM element, populating it with level data and handling user interactions.
// It encapsulates the functionality for displaying and interacting with a collection of puzzle levels.
export class LevelMenuComponent {
  root: HTMLElement;
  isEditor: boolean;
  container: HTMLElement;
  deleting: boolean;
  selectingIcon: boolean;
  togglingHidden: boolean;
  defaultSize: number;
  book: Book | null = null;

  constructor(root: HTMLElement, isEditor: boolean) {
    this.root = root;
    this.isEditor = isEditor;
    this.container = cast(this.root.querySelector(".content"), HTMLElement);

    // TODO: turn it into a single state variable
    this.deleting = false;
    this.selectingIcon = false;
    this.togglingHidden = false;
    this.defaultSize = 6;

    this.onIconClick = this.onIconClick.bind(this);
  }

  openBook(book: Book): void {
    this.book = book;
    // Recalculate indices to account for hidden levels
    if (this.isEditor) {
      this.reindexLevels();
      this.updateLevelCounter();
    }
  }

  // TODO: rename; this creates an html node
  createLevelInfo(level: Level, state: LevelState, glow: boolean): HTMLDivElement {
    let element = htmlStringToElement(`<div class="level_icon">
    <img class="level_icon_image"> </img>
    <div class="level_icon_par"> </div>
    </div>
    `);
    assert(element instanceof HTMLDivElement);

    // Get cached or generate icon dataURL
    const dataURL = getCachedLevelIconDataUrl(level);
    let icon = element.querySelector(".level_icon_image");
    assert(icon instanceof HTMLImageElement);
    icon.src = dataURL;
    icon.style.width = `${ICON_SIZE}px`;
    icon.style.height = `${ICON_SIZE}px`;

    // TODO: find a better way to associate the level with the element
    // XXX
    (element as any).level = level;

    if (this.isEditor || state >= 2) {
      element.onclick = this.onIconClick.bind(this);
    }

    if (this.isEditor) {
      let par_display = element.querySelector(".level_icon_par");
      assert(par_display instanceof HTMLElement);
      let par = (level.solutions && level.solutions.length > 0) ? vector_sum(level.solutions[0]) : 0;
      par_display.innerText = String(par);
      let colors = ["black", "black", "black", "magenta", "red", "orange", "cyan", "green", "purple", "blue"];
      par_display.style.color = colors[par] || "purple";

      element.style.borderColor = colors[par] || "purple";

      if (level.isIcon) {
        element.classList.add("bookIconRepresentative");
      }
      if (level.hidden) {
        element.classList.add("icon_hidden");
      }
    } else {
      applyStateClass(element, state);
      if (glow) {
        element.classList.add("icon_glow");
      }
    }

    return element;
    // TODO: add classes based on
  }

  // this function is to be called on icons using the onclick event
  // now "this" refers to the LevelMenuComponent instance due to bind()
  onIconClick = (event: MouseEvent): void => {
    if (!(event.target instanceof HTMLElement)) {
      return;
    }
    const iconElement = event.target.closest(".level_icon"); // Get the icon element
    if (!(iconElement instanceof HTMLElement)) {
      return;
    }
    // XXX: using any to access property on the element
    const iconLevel = (iconElement as any).level;
    if (this.deleting) {
      iconElement.remove();
      this.saveIconOrder();
    } else if (this.selectingIcon) {
      assert(this.book !== null);
      this.book.levels.forEach(function (a) {
        a.isIcon = false;
      });
      iconLevel.isIcon = true;

      this.toggleSelectIcon();
      this.displayIcons();
      this.saveBook();
    } else if (this.togglingHidden) {
      iconLevel.hidden = !iconLevel.hidden;
      this.reindexLevels();
      this.displayIcons();
      this.updateLevelCounter();
      this.saveBook();
    } else {
      //let levelObject = Level.fromJsonObject(iconElement.level);

      assert(this.book !== null);

      if (this.isEditor) {
        //editor.setBook(this.book);

        // TODO: some kind of callback in order to nicely set level data?
        appContext.editLevel(iconLevel, this.book);
      } else {
        console.log("Attempting to open level:", iconLevel);
        appContext.playLevel(iconLevel, this.book);
      }
    }
  }

  reindexLevels() {
    let index = 0;
    assert(this.book !== null);
    for (let i = 0; i < this.book.levels.length; i++) {
      let level = this.book.levels[i];
      //if (!level.hidden) {
        level.index = index++;
     // }
    }
  }

  updateLevelCounter() {
    if (!this.isEditor || !this.book) {
      return;
    }
    const counter = this.root.querySelector("#levelCounter");
    if (counter instanceof HTMLElement) {
      const nonHiddenCount = this.book.levels.filter(level => !level.hidden).length;
      counter.innerText = `Levels: ${nonHiddenCount}`;
    }
  }

  displayIcons() {
    if (!this.book) {
      this.container.innerHTML = "Loading levels...";
      return;
    }

    this.container.innerHTML = "";

    let states = null;
    if (!this.isEditor) {
      states = calculateStates(this.book);
    }

    let firstVisibleIndex = -1;
    if (!this.isEditor) {
      for (let i = 0; i < this.book.levels.length; i++) {
        if (!this.book.levels[i].hidden) {
          firstVisibleIndex = i;
          break;
        }
      }
    }
    
    for (let i = 0; i < this.book.levels.length; i++) {
      let level = this.book.levels[i];
      
      // Filter out hidden levels in normal menu
      if (!this.isEditor && level.hidden) {
        continue;
      }
      
      let glow = !this.isEditor && firstVisibleIndex >= 0 && i == firstVisibleIndex && !!states && states[i] == LEVEL_STATES.UNSOLVED;
      // check par, and based on it figure out the restriction level.
      this.container.appendChild(
        this.createLevelInfo(
          level,
          states ? states[i] : LEVEL_STATES.UNSOLVED,
          glow
        )
      );
    }
    
    if (this.isEditor) {
      this.updateLevelCounter();
    }
  }

  saveBook() {
    if (this.isEditor) {
      assert(this.book !== null);
      save_editor_book(this.book);
    }
  }

  saveIconOrder() {
    // This function saves the order of levels after they have been reordered by the user using drag-and-drop with Sortable.js
    // The way it works is by looking through the DOM and getting the associated level object from each level_icon element.
    // TODO: see if Sortable.js provides an alternative way to do this. 
    if (this.isEditor) {
      assert(this.book !== null);
      this.book.levels = Array.from(this.container.children).map(
        function (element: Element): Level {
          // XXX: using any to access property on the element
          return (element as any).level as Level;
        }
      );
      this.reindexLevels();
      this.updateLevelCounter();
      this.saveBook();
    }
  }

  newLevel() {
    if (this.isEditor) {
      const level = Level.empty(this.defaultSize);
      assert(this.book !== null);
      level.book = this.book;
      this.book.levels.push(level);
      this.displayIcons();
      this.reindexLevels();
      this.updateLevelCounter();
      this.saveBook();
    }
  }

  setDefaultSize(): void {
    if (this.isEditor) {
      const input = window.prompt("Enter default grid size:", String(this.defaultSize));
      if (input !== null) {
        const size = Number.parseInt(input, 10);
        if (!isNaN(size) && size > 0) {
          this.defaultSize = size;
        } else {
          alert("Please enter a valid positive integer");
        }
      }
    }
  }

  async displayBookJson(): Promise<void> {
    if (this.isEditor) {
      let s = JSON.stringify(this.book, book_replacer);
      try {
        await navigator.clipboard.writeText(s);
        alert("Saved to clipboard");
      } catch (error) {
        // If clipboard copy fails, display a textarea with the JSON
        this.showJsonTextarea(s);
      }
    }
  }

  showJsonTextarea(jsonString: string): void {
    // Pure slop, creating dom objects in js...
    
    // Remove any existing JSON textarea
    const existing = this.root.querySelector("#jsonTextareaContainer");
    if (existing) {
      existing.remove();
    }

    // Create container
    const container = document.createElement("div");
    container.id = "jsonTextareaContainer";
    container.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--white, white);
      border: 2px solid var(--border_gray, #c1bbaf);
      padding: 20px;
      z-index: 1000;
      max-width: 90%;
      max-height: 90vh;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    `;

    // Create label
    const label = document.createElement("p");
    label.textContent = "Copy to clipboard failed. Please copy the JSON manually:";
    label.style.marginBottom = "10px";
    container.appendChild(label);

    // Create textarea
    const textarea = document.createElement("textarea");
    textarea.value = jsonString;
    textarea.readOnly = true;
    textarea.style.cssText = `
      width: 100%;
      min-width: 400px;
      min-height: 300px;
      font-family: monospace;
      font-size: 12px;
      padding: 10px;
      border: 1px solid var(--border_gray, #c1bbaf);
      resize: both;
    `;
    container.appendChild(textarea);

    // Create close button
    const closeButton = document.createElement("button");
    closeButton.textContent = "Close";
    closeButton.onclick = () => container.remove();
    closeButton.style.cssText = `
      margin-top: 10px;
      padding: 8px 16px;
    `;
    container.appendChild(closeButton);

    // Add to document
    this.root.appendChild(container);

    // Select all text in textarea for easy copying
    textarea.select();
    textarea.focus();
  }

  appendJson(): void {
    if (this.isEditor) {
      let jsonString = window.prompt("Paste JSON (book object or array of levels)");
      if (!jsonString) {
        return;
      }

      let parsed;
      try {
        parsed = JSON.parse(jsonString, book_reviver);
      } catch (e: unknown) {
        alert("Error parsing JSON: " + (e as Error).message);
        return;
      }

      let levelsToAppend = [];

      // Handle two input formats: book object or array of levels
      if (Array.isArray(parsed)) {
        levelsToAppend = parsed;
      } else if (parsed && parsed.levels && Array.isArray(parsed.levels)) {
        levelsToAppend = parsed.levels;
      } else {
        alert("Invalid format: expected a book object with 'levels' property or an array of levels");
        return;
      }
      assert(this.book !== null);

      // Append levels to the book
      for (let level of levelsToAppend) {
        // Preserve original ID from JSON (Level.fromJsonObject handles ID generation if missing)
        level.index = -1; // Will be set by reindexLevels()
        this.book.levels.push(level);
      }

      // Update book state
      this.reindexLevels();
      this.displayIcons();
      this.updateLevelCounter();
      this.saveBook();
    }
  }

  toggleDelete(): void {
    if (this.isEditor) {
      // toggle the deleting state
      this.deleting = !this.deleting;
      this.container.classList.toggle("deleting");
    }
  }

  toggleSelectIcon(): void {
    if (this.isEditor) {
      // toggle the selecting icon state
      this.selectingIcon = !this.selectingIcon;
      this.container.classList.toggle("selectingIcon");
    }
  }

  toggleHidden() {
    if (this.isEditor) {
      // toggle the toggling hidden state
      this.togglingHidden = !this.togglingHidden;
      this.container.classList.toggle("togglingHidden");
      
      // Update button highlight
      const button = this.root.querySelector("#toggleHiddenButton");
      if (button) {
        if (this.togglingHidden) {
          button.classList.add("drawModeActive");
        } else {
          button.classList.remove("drawModeActive");
        }
      }
    }
  }

  changeBookTitle(): void {
    assert(this.book !== null);
    
    let new_title = prompt("Set book title", this.book.title);

    if (new_title) {
      this.book.title = new_title;
    }
    save_editor_book(this.book);
  }

  // TODO: put this in "subclass"
  clearAllBests(): void {
    assert(this.book !== null);
    for (let i = 0; i < this.book.levels.length; i++) {
      clearBestNumMoves(this.book.levels[i]);
    }
    this.displayIcons();
  }

  onShow(): void {
    this.displayIcons();
  }
}