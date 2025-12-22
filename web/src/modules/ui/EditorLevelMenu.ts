"use strict";

import { assert, cast } from '../utils/helpers.ts';
import { Book } from '../core/Book.ts';
import { Level } from '../core/Level.ts';
import { appContext } from '../core/AppContext.ts';
import { save_editor_book, book_reviver, reindexLevels } from '../core/bookUtils.ts';
import { book_replacer } from '../core/bookUtils.ts';
import { clearBestNumMoves } from '../core/levelUtils.ts';
import { LevelIconGrid } from './LevelIconGrid.tsx';
import { showJsonModal } from './JsonModal.tsx';
import { IconDisplayType } from './iconDisplayCalculations.ts';
import Sortable from 'sortablejs';

export class EditorLevelMenu {
  root: HTMLElement;
  levelMenu: LevelIconGrid;
  deleting: boolean;
  selectingIcon: boolean;
  togglingHidden: boolean;
  defaultSize: number;
  iconDisplayType: IconDisplayType = "none";

  constructor(root: HTMLElement) {
    this.root = root;
    
    // Editor-specific state
    this.deleting = false;
    this.selectingIcon = false;
    this.togglingHidden = false;
    this.defaultSize = 6;

    // Create LevelIconGrid with editor callbacks
    this.levelMenu = new LevelIconGrid(root, true, {
      onIconClick: this.handleIconClick.bind(this),
      onBookOpened: this.handleBookOpened.bind(this),
      getIconDisplayType: () => this.iconDisplayType,
    });

    this.setupSortable();
  }

  handleIconClick(level: Level, element: HTMLElement): void {
    if (this.deleting) {
      element.remove();
      this.saveIconOrder();
    } else if (this.selectingIcon) {
      assert(this.levelMenu.book !== null);
      this.levelMenu.book.levels.forEach((a) => {
        a.isIcon = false;
      });
      level.isIcon = true;

      this.toggleSelectIcon();
      this.levelMenu.displayIcons();
      this.saveBook();
    } else if (this.togglingHidden) {
      level.hidden = !level.hidden;
      this.reindexLevels();
      this.levelMenu.displayIcons();
      this.updateLevelCounter();
      this.saveBook();
    } else {
      assert(this.levelMenu.book !== null);
      appContext.editLevel(level, this.levelMenu.book);
    }
  }

  handleBookOpened(book: Book): void {
    this.reindexLevels();
    this.updateLevelCounter();
  }

  reindexLevels() {
    assert(this.levelMenu.book !== null);
    reindexLevels(this.levelMenu.book.levels);
  }

  updateLevelCounter() {
    if (!this.levelMenu.book) {
      return;
    }
    const counter = this.root.querySelector("#levelCounter");
    if (counter instanceof HTMLElement) {
      const nonHiddenCount = this.levelMenu.book.levels.filter(level => !level.hidden).length;
      counter.innerText = `Levels: ${nonHiddenCount}`;
    }
  }

  saveBook() {
    assert(this.levelMenu.book !== null);
    save_editor_book(this.levelMenu.book);
  }

  saveIconOrder() {
    // This function saves the order of levels after they have been reordered by the user using drag-and-drop with Sortable.js
    // The way it works is by looking through the DOM and getting the associated level object from each level_icon element.
    // TODO: see if Sortable.js provides an alternative way to do this. 
    assert(this.levelMenu.book !== null);
    this.levelMenu.book.levels = Array.from(this.levelMenu.container.children).map(
      (element: Element): Level => {
        // XXX: using any to access property on the element
        return (element as any).level as Level;
      }
    );
    this.reindexLevels();
    this.updateLevelCounter();
    this.saveBook();
  }

  onShow() {
    this.levelMenu.onShow();
  }

  async displayBookJson(): Promise<void> {
    const s = JSON.stringify(this.levelMenu.book, book_replacer);
    try {
      await navigator.clipboard.writeText(s);
      alert("Saved to clipboard");
    } catch (error) {
      // If clipboard copy fails, display a textarea with the JSON
      showJsonModal(this.root, s);
    }
  }

  appendJson(): void {
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
    assert(this.levelMenu.book !== null);

    // Append levels to the book
    for (let level of levelsToAppend) {
      // Preserve original ID from JSON (Level.fromJsonObject handles ID generation if missing)
      level.index = -1; // Will be set by reindexLevels()
      this.levelMenu.book.levels.push(level);
    }

    // Update book state
    this.reindexLevels();
    this.levelMenu.displayIcons();
    this.updateLevelCounter();
    this.saveBook();
  }

  newLevel() {
    const level = Level.empty(this.defaultSize);
    assert(this.levelMenu.book !== null);
    level.book = this.levelMenu.book;
    this.levelMenu.book.levels.push(level);
    this.levelMenu.displayIcons();
    this.reindexLevels();
    this.updateLevelCounter();
    this.saveBook();
  }

  setDefaultSize(): void {
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

  toggleDelete(): void {
    // toggle the deleting state
    this.deleting = !this.deleting;
    this.levelMenu.container.classList.toggle("deleting");
  }

  toggleSelectIcon(): void {
    // toggle the selecting icon state
    this.selectingIcon = !this.selectingIcon;
    this.levelMenu.container.classList.toggle("selectingIcon");
  }

  toggleHidden() {
    // toggle the toggling hidden state
    this.togglingHidden = !this.togglingHidden;
    this.levelMenu.container.classList.toggle("togglingHidden");
    
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

  setIconDisplayType(type: string): void {
    if (type === "par" || type === "eric" || type === "obv" || type === "eric/par" || type === "obv/par" || type === "none") {
      this.iconDisplayType = type;
      this.levelMenu.displayIcons();
    }
  }

  changeBookTitle(): void {
    assert(this.levelMenu.book !== null);
    
    const new_title = prompt("Set book title", this.levelMenu.book.title);

    if (new_title) {
      this.levelMenu.book.title = new_title;
    }
    save_editor_book(this.levelMenu.book);
  }

  clearAllBests(): void {
    assert(this.levelMenu.book !== null);
    for (let i = 0; i < this.levelMenu.book.levels.length; i++) {
      clearBestNumMoves(this.levelMenu.book.levels[i]);
    }
    this.levelMenu.displayIcons();
  }

  openBook(book: Book) {
    this.levelMenu.openBook(book);
  }

  setupSortable() {
    Sortable.create(this.levelMenu.container, {
      draggable: '.level_icon',
      group: "editor",
      onEnd: () => {
        this.saveIconOrder();
      }
    });
    Sortable.create(cast(this.root.querySelector("#iconContainer2"), HTMLElement), {
      draggable: '.level_icon',
      group: "editor",
      onEnd: () => {
        this.saveIconOrder();
      }
    });
  }
}