"use strict";

import { assert, cast } from '../utils/helpers.ts';
import { Book } from '../core/Book.ts';
import { Level } from '../core/Level.ts';
import { appContext } from '../core/AppContext.ts';
import { book_reviver, reindexLevels } from '../core/bookUtils.ts';
import { save_editor_book } from 'modules/core/editorBooks.ts';
import { book_replacer } from '../core/bookUtils.ts';
import { clearBestNumMoves } from '../core/levelUtils.ts';
import { level_check_solution } from '../core/algo.ts';
import { LevelIconGrid } from './LevelIconGrid.tsx';
import { showJsonModal } from './JsonModal.tsx';
import { IconDisplayType } from './iconDisplayCalculations.ts';
import Sortable from 'sortablejs';

export class EditorLevelMenuScreen {
  root: HTMLElement;
  levelMenu: LevelIconGrid;
  deleting: boolean;
  selectingIcon: boolean;
  togglingHidden: boolean;
  defaultSize: number;
  iconDisplayType: IconDisplayType = "none";
  undoStack: { book: Book; action: string }[] = [];

  constructor(root: HTMLElement) {
    this.root = root;
    
    // Editor-specific state
    this.deleting = false;
    this.selectingIcon = false;
    this.togglingHidden = false;
    this.defaultSize = 6;

    // Create LevelIconGrid with editor callbacks
    const iconContainer = cast(root.querySelector("#iconContainer"), HTMLElement);
    this.levelMenu = new LevelIconGrid(iconContainer, true, {
      onIconClick: this.handleIconClick.bind(this),
      onBookOpened: this.handleBookOpened.bind(this),
      getIconDisplayType: () => this.iconDisplayType,
    });

    this.setupSortable();
    this.setupKeyboardListeners();
  }

  handleIconClick(level: Level, element: HTMLElement): void {
    if (this.deleting) {
      this.saveUndoState("delete_level");
      element.remove();
      this.saveIconOrder();
    } else if (this.selectingIcon) {
      assert(this.levelMenu.book !== null);
      this.saveUndoState("set_icon");
      this.levelMenu.book.levels.forEach((a) => {
        a.isIcon = false;
      });
      level.isIcon = true;

      this.toggleSelectIcon();
      this.levelMenu.displayIcons();
      this.saveBook();
    } else if (this.togglingHidden) {
      this.saveUndoState("toggle_hidden");
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
    this.saveUndoState("reorder_levels");
    this.levelMenu.book.levels = Array.from(this.levelMenu.container.children).map(
      (element: Element): Level => {
        // XXX: using any to access property on the element
        return (element as any).level as Level;
      }
    );
    this.reindexLevels();
    this.updateLevelCounter();
    this.levelMenu.displayIcons(); // Refresh icons to update nonHiddenIndex values
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

    this.saveUndoState("append_levels");

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
    this.saveUndoState("new_level");
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
    if (type === "par" || type === "eric" || type === "obv" || type === "eric/par" || type === "obv/par" || type === "daily" || type === "none") {
      this.iconDisplayType = type;
      this.levelMenu.displayIcons();
    }
  }

  changeBookTitle(): void {
    assert(this.levelMenu.book !== null);
    
    const new_title = prompt("Set book title", this.levelMenu.book.title);

    if (new_title) {
      this.saveUndoState("change_title");
      this.levelMenu.book.title = new_title;
    }
    save_editor_book(this.levelMenu.book);
  }

  clearAllBests(): void {
    assert(this.levelMenu.book !== null);
    this.saveUndoState("clear_bests");
    for (let i = 0; i < this.levelMenu.book.levels.length; i++) {
      clearBestNumMoves(this.levelMenu.book.levels[i]);
    }
    this.levelMenu.displayIcons();
  }

  bulkImportSolutions(): void {
    const jsonString = window.prompt("Paste JSON containing solutions");
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

    let levelsData: Level[];

    // Handle both book object and array of levels
    if (Array.isArray(parsed)) {
      levelsData = parsed;
    } else if (parsed && parsed.levels && Array.isArray(parsed.levels)) {
      levelsData = parsed.levels;
    } else {
      alert("Invalid format: expected a book object with 'levels' property or an array of levels");
      return;
    }

    let indexedLevelsData: { [id: string]: Level } = {};
    for (let levelData of levelsData) {
      if (levelData.id) {
        indexedLevelsData[levelData.id] = levelData;
      }
    }

    assert(this.levelMenu.book !== null);
    
    let updatedCount = 0;
    let someInvalid = false;

    // Iterate through provided levels and update solutions by ID
    for (let originalLevel of this.levelMenu.book.levels) {
      if (!originalLevel.id) {
        continue;
      }

      const importedLevel = indexedLevelsData[originalLevel.id];

      // If solutions exist and are valid, import them
      if (importedLevel && importedLevel.solutions && Array.isArray(importedLevel.solutions)) {
        const validSolutions = importedLevel.solutions.filter((sol: number[]) => 
          level_check_solution(originalLevel, sol)
        );

        if (validSolutions.length < importedLevel.solutions.length) {
          console.warn(`Some solutions for level ID ${originalLevel.id} were invalid and have been skipped`);
          someInvalid = true;
        }
        
        if (validSolutions.length > 0) {
          originalLevel.solutions = validSolutions;
          if (importedLevel.solutionType) {
            originalLevel.solutionType = importedLevel.solutionType;
          }
          updatedCount++;
        }
      }
    }

    if (updatedCount > 0) {
      this.saveUndoState("import_solutions");
      this.saveBook();
      this.levelMenu.displayIcons();
      alert(`Updated solutions for ${updatedCount} level(s)`);
    } else {
      alert("No valid solutions found to import");
    }
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

  saveUndoState(action: string): void {
    if (!this.levelMenu.book) {
      return;
    }
    // Deep clone the book using serialization
    // TODO: optimize if performance becomes an issue
    const bookJson = JSON.stringify(this.levelMenu.book, book_replacer);
    const bookClone = JSON.parse(bookJson, book_reviver);
    this.undoStack.push({
      book: bookClone,
      action: action,
    });
  }

  undo(): boolean {
    const undoEntry = this.undoStack.pop();
    if (!undoEntry) {
      return false;
    }
    // Restore the book state
    this.levelMenu.book = undoEntry.book;
    // Refresh the UI
    this.levelMenu.displayIcons();
    this.updateLevelCounter();
    this.saveBook();
    return true;
  }

  setupKeyboardListeners(): void {
    document.addEventListener("keydown", (e: KeyboardEvent) => {
      // Handle Ctrl+Z or Cmd+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        this.undo();
      }
    });
  }
}