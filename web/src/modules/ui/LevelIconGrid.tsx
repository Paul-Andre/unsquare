"use strict";

import { cast } from '../utils/helpers.ts';
import { Level } from '../core/Level.ts';
import { Book } from 'modules/core/Book.ts';
import { createLevelIcon } from './LevelIcon.tsx';
import { IconDisplayType } from './iconDisplayCalculations.ts';
import {
  LEVEL_STATES,
  LevelState,
  calculateStates,
} from './levelStateUtils.ts';


// This component displays a grid of level icons. Behavior is injected via callbacks.
export class LevelIconGrid {
  root: HTMLElement;
  isEditorMode: boolean;
  container: HTMLElement;
  book: Book | null = null;
  onIconClick?: (level: Level, element: HTMLElement) => void;
  onBookOpened?: (book: Book) => void;
  getIconDisplayType?: () => IconDisplayType;

  constructor(
    root: HTMLElement,
    isEditorMode: boolean,
    callbacks?: {
      onIconClick?: (level: Level, element: HTMLElement) => void;
      onBookOpened?: (book: Book) => void;
      getIconDisplayType?: () => IconDisplayType;
    }
  ) {
    this.root = root;
    this.isEditorMode = isEditorMode;
    this.container = cast(this.root.querySelector(".content"), HTMLElement);
    this.onIconClick = callbacks?.onIconClick;
    this.onBookOpened = callbacks?.onBookOpened;
    this.getIconDisplayType = callbacks?.getIconDisplayType;
  }

  openBook(book: Book): void {
    this.book = book;
    if (this.onBookOpened) {
      this.onBookOpened(book);
    }
  }

  displayIcons() {
    if (!this.book) {
      this.container.innerHTML = "Loading levels...";
      return;
    }

    this.container.innerHTML = "";

    const states: LevelState[] | null = !this.isEditorMode ? calculateStates(this.book) : null;

    let firstVisibleIndex = -1;
    if (!this.isEditorMode) {
      for (let i = 0; i < this.book.levels.length; i++) {
        if (!this.book.levels[i].hidden) {
          firstVisibleIndex = i;
          break;
        }
      }
    }
    
    const iconDisplayType = this.getIconDisplayType ? this.getIconDisplayType() : "none";
    
    for (let i = 0; i < this.book.levels.length; i++) {
      const level = this.book.levels[i];
      
      // Filter out hidden levels in normal menu
      if (!this.isEditorMode && level.hidden) {
        continue;
      }
      
      const state = states ? states[i] : LEVEL_STATES.UNSOLVED;
      const glow = !this.isEditorMode && firstVisibleIndex >= 0 && i == firstVisibleIndex && state == LEVEL_STATES.UNSOLVED;
      
      const iconElement = createLevelIcon({
        level,
        state,
        glow,
        isEditor: this.isEditorMode,
        iconDisplayType,
        onClick: this.onIconClick,
      });
      
      this.container.appendChild(iconElement);
    }
  }


  onShow(): void {
    this.displayIcons();
  }
}
