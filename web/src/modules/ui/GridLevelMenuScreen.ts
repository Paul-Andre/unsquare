"use strict";

import { cast } from '../utils/helpers.ts';
import { Book } from '../core/Book.ts';
import { Level } from '../core/Level.ts';
import { LevelIconGrid } from './LevelIconGrid.tsx';
import { appContext } from '../core/AppContext.ts';
import { createUnlockAllSection } from './UnlockAllSection.tsx';
import { Signal, SingleSignalConsumer, get } from 'modules/utils/Signal.ts'




export class GridLevelMenuScreen {
  root: HTMLElement;
  titleElement: HTMLElement;
  levelMenu: LevelIconGrid;
  unlockSectionContainer: HTMLElement;
  book: Book | null = null;
  bookSignalConsumer: SingleSignalConsumer<Book>;

  constructor(root: HTMLElement) {
    this.root = root;
    this.titleElement = cast(root.querySelector("h1"), HTMLElement);
    
    const iconContainer = cast(root.querySelector("#iconContainer"), HTMLElement);
    this.levelMenu = new LevelIconGrid(iconContainer, false, {
      onIconClick: (level: Level, element: HTMLElement) => {
        if (this.book !== null) {
          appContext.playLevel(level, get(this.book));
        }
      },
    });

    this.unlockSectionContainer = cast(root.querySelector(".footer"), HTMLElement);
    this.bookSignalConsumer = new SingleSignalConsumer((book) => {
      console.log("openeind from consumer");
      this.openBook(book)}
    );
  }

  bindBookSignal(signal: Signal<Book>){
    this.bookSignalConsumer.bind(signal);
  }

  openBook(book: Book): void {
    this.book = book;
    this.titleElement.textContent = book.title;
    this.levelMenu.openBook(book);
    this.levelMenu.displayIcons();
    this.updateUnlockSection();
  }

  onShow(): void {
    this.levelMenu.onShow();
    this.updateUnlockSection();
  }

  updateUnlockSection(): void {
    if (this.book) {
      createUnlockAllSection({
        book: get(this.book),
        container: this.unlockSectionContainer,
        showText: true,
      });
    }
  }
}

