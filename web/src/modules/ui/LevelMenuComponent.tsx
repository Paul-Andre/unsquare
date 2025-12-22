"use strict";

import { assert, cast } from '../utils/helpers.ts';
import { appContext } from '../core/AppContext.ts';
import { Level } from '../core/Level.ts';
import { save_editor_book, book_reviver, reindexLevels } from '../core/bookUtils.ts';
import { book_replacer } from '../core/bookUtils.ts';
import { clearBestNumMoves } from '../core/levelUtils.ts';
import { Book } from 'modules/core/Book.ts';
import { createLevelIcon } from './LevelIcon.tsx';
import { showJsonModal } from './JsonModal.tsx';
import { IconDisplayType } from './iconDisplayCalculations.ts';
import {
  LEVEL_STATES,
  LevelState,
  calculateStates,
} from './levelStateUtils.ts';


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
  iconDisplayType: IconDisplayType = "none";
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
  }

  openBook(book: Book): void {
    this.book = book;
    // Recalculate indices to account for hidden levels
    if (this.isEditor) {
      this.reindexLevels();
      this.updateLevelCounter();
    }
  }

  onIconClick = (level: Level, element: HTMLElement): void => {
    if (this.deleting) {
      element.remove();
      this.saveIconOrder();
    } else if (this.selectingIcon) {
      assert(this.book !== null);
      this.book.levels.forEach((a) => {
        a.isIcon = false;
      });
      level.isIcon = true;

      this.toggleSelectIcon();
      this.displayIcons();
      this.saveBook();
    } else if (this.togglingHidden) {
      level.hidden = !level.hidden;
      this.reindexLevels();
      this.displayIcons();
      this.updateLevelCounter();
      this.saveBook();
    } else {
      assert(this.book !== null);

      if (this.isEditor) {
        appContext.editLevel(level, this.book);
      } else {
        appContext.playLevel(level, this.book);
      }
    }
  }

  reindexLevels() {
    assert(this.book !== null);
    reindexLevels(this.book.levels);
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

    const states: LevelState[] | null = !this.isEditor ? calculateStates(this.book) : null;

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
      const level = this.book.levels[i];
      
      // Filter out hidden levels in normal menu
      if (!this.isEditor && level.hidden) {
        continue;
      }
      
      const state = states ? states[i] : LEVEL_STATES.UNSOLVED;
      const glow = !this.isEditor && firstVisibleIndex >= 0 && i == firstVisibleIndex && state == LEVEL_STATES.UNSOLVED;
      
      const iconElement = createLevelIcon({
        level,
        state,
        glow,
        isEditor: this.isEditor,
        iconDisplayType: this.iconDisplayType,
        onClick: this.onIconClick,
      });
      
      this.container.appendChild(iconElement);
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
        (element: Element): Level => {
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
      const s = JSON.stringify(this.book, book_replacer);
      try {
        await navigator.clipboard.writeText(s);
        alert("Saved to clipboard");
      } catch (error) {
        // If clipboard copy fails, display a textarea with the JSON
        showJsonModal(this.root, s);
      }
    }
  }

  appendJson(): void {
    if (this.isEditor) {
      const jsonString = window.prompt("Paste JSON (book object or array of levels)");
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

  setIconDisplayType(type: string): void {
    if (this.isEditor && (type === "par" || type === "eric" || type === "obv" || type === "eric/par" || type === "obv/par" || type === "none")) {
      this.iconDisplayType = type;
      this.displayIcons();
    }
  }

  changeBookTitle(): void {
    assert(this.book !== null);
    
    const new_title = prompt("Set book title", this.book.title);

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
