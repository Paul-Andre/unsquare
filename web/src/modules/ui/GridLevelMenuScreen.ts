"use strict";

import { cast } from '../utils/helpers.ts';
import { Book } from '../core/Book.ts';
import { Level } from '../core/Level.ts';
import { LevelIconGrid } from './LevelIconGrid.tsx';
import { appContext } from '../core/AppContext.ts';

export class GridLevelMenuScreen {
  root: HTMLElement;
  titleElement: HTMLElement;
  levelMenu: LevelIconGrid;
  book: Book | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    this.titleElement = cast(root.querySelector("h1"), HTMLElement);
    
    const iconContainer = cast(root.querySelector("#iconContainer"), HTMLElement);
    this.levelMenu = new LevelIconGrid(iconContainer, false, {
      onIconClick: (level: Level, element: HTMLElement) => {
        if (this.book !== null) {
          appContext.playLevel(level, this.book);
        }
      },
    });
  }

  openBook(book: Book): void {
    this.book = book;
    this.titleElement.textContent = book.title;
    this.levelMenu.openBook(book);
    this.levelMenu.displayIcons();
  }

  onShow(): void {
    this.levelMenu.onShow();
  }
}

