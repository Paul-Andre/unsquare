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
  isEditorMode: boolean;
  container: HTMLElement;
  book: Book | null = null;
  onIconClick?: (level: Level, element: HTMLElement) => void;
  onBookOpened?: (book: Book) => void;
  getIconDisplayType?: () => IconDisplayType;

  constructor(
    container: HTMLElement,
    isEditorMode: boolean,
    callbacks?: {
      onIconClick?: (level: Level, element: HTMLElement) => void;
      onBookOpened?: (book: Book) => void;
      getIconDisplayType?: () => IconDisplayType;
    }
  ) {
    this.isEditorMode = isEditorMode;
    this.container = container
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
    
    let nonHiddenIndex = 0;
    for (let i = 0; i < this.book.levels.length; i++) {
      const level = this.book.levels[i];
      
      // Filter out hidden levels in normal menu
      if (!this.isEditorMode && level.hidden) {
        continue;
      }
      
      // In editor mode, only count non-hidden levels for the index
      // In player mode, all levels shown are non-hidden (already filtered)
      if (this.isEditorMode) {
        if (!level.hidden) {
          nonHiddenIndex++;
        }
      } else {
        nonHiddenIndex++;
      }
      
      const state = states ? states[i] : LEVEL_STATES.UNSOLVED;
      const glow = !this.isEditorMode && firstVisibleIndex >= 0 && i == firstVisibleIndex && state == LEVEL_STATES.UNSOLVED;
      
      const iconElement = createLevelIcon({
        level,
        state,
        glow,
        isEditor: this.isEditorMode,
        iconDisplayType,
        nonHiddenIndex: this.isEditorMode ? (level.hidden ? null : nonHiddenIndex - 1) : nonHiddenIndex - 1,
        onClick: this.onIconClick,
      });
      
      this.container.appendChild(iconElement);
    }
  }


  onShow(): void {
    this.displayIcons();
  }
}
