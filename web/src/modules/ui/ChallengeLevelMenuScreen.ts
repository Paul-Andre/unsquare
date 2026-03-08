"use strict";

import { cast } from '../utils/helpers.ts';
import { Book } from '../core/Book.ts';
import { createWeeklyChallengeCard } from './WeeklyChallengeCard.tsx';
import { createUnlockAllSection } from './UnlockAllSection.tsx';
import { Signal, SingleSignalConsumer } from 'modules/utils/Signal.ts';

export class ChallengeLevelMenuScreen {
  root: HTMLElement;
  container: HTMLElement;
  titleElement: HTMLElement;
  unlockSectionContainer: HTMLElement;
  book: Book | null = null;

  bookSignalConsumer: SingleSignalConsumer<Book | null>;

  constructor(root: HTMLElement) {
    this.root = root;
    this.container = cast(root.querySelector("#challengeLevelContainer"), HTMLElement);
    this.titleElement = cast(root.querySelector("h1"), HTMLElement);
    this.unlockSectionContainer = cast(root.querySelector(".footer"), HTMLElement);

    this.bookSignalConsumer = new SingleSignalConsumer((book) => {
      if (book!==null) {
         this.openBook(book);
      }
    });
  }

  bindBookSignal(signal: Signal<Book|null>): void {
    this.bookSignalConsumer.bindAndFire(signal);
  }

  openBook(book: Book): void {
    this.book = book;
    this.titleElement.textContent = book.title;
    this.displayChallengeCards();
    this.updateUnlockSection();
  }

  onShow(): void {
    if (this.book) {
      this.displayChallengeCards();
      this.updateUnlockSection();
    }
  }

  displayChallengeCards(): void {
    if (!this.book) {
      this.container.innerHTML = "No book loaded.";
      return;
    }

    // Clear container
    this.container.innerHTML = "";

    // Reverse the order (slice to avoid mutating original array)
    const challengeLevels = this.book.levels.slice().reverse();

    if (challengeLevels.length === 0) {
      this.container.innerHTML = "No challenge levels found in this book.";
      return;
    }

    // Create a card for each challenge level
    for (const level of challengeLevels) {
      const cardContainer = document.createElement("div");
      cardContainer.className = "challenge_card_container";
      this.container.appendChild(cardContainer);

      createWeeklyChallengeCard({
        level,
        book: this.book,
        container: cardContainer,
      });
    }
  }

  updateUnlockSection(): void {
    if (this.book) {
      createUnlockAllSection({
        book: this.book,
        container: this.unlockSectionContainer,
      });
    }
  }
}

