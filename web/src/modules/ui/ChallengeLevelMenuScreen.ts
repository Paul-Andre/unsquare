"use strict";

import { cast } from '../utils/helpers.ts';
import { Book } from '../core/Book.ts';
import { createWeeklyChallengeCard } from './WeeklyChallengeCard.tsx';

export class ChallengeLevelMenuScreen {
  root: HTMLElement;
  container: HTMLElement;
  titleElement: HTMLElement;
  book: Book | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    this.container = cast(root.querySelector("#challengeLevelContainer"), HTMLElement);
    this.titleElement = cast(root.querySelector("h1"), HTMLElement);
  }

  openBook(book: Book): void {
    this.book = book;
    this.titleElement.textContent = book.title;
    this.displayChallengeCards();
  }

  onShow(): void {
    if (this.book) {
      this.displayChallengeCards();
    }
  }

  displayChallengeCards(): void {
    if (!this.book) {
      this.container.innerHTML = "No book loaded.";
      return;
    }

    // Clear container
    this.container.innerHTML = "";

    // Filter challenge levels and reverse the order
    const challengeLevels = this.book.levels
      .filter(level => level.mode === "challenge")
      .reverse();

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
}

