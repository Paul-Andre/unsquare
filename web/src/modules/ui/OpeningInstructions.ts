"use strict";

import { assert, cast, ensureNotNull } from '../utils/helpers.ts';
import { appContext } from '../core/AppContext.ts';

export class OpeningInstructions {
  root: HTMLElement;
  slidesContainer: HTMLElement;
  prevBtn: HTMLButtonElement;
  nextBtn: HTMLButtonElement;
  slides: Element[];
  currentSlideIndex: number;
  hasAlreadyWentToFirstLevel: boolean;

  constructor(root: HTMLElement) {
    this.root = root;
    this.slidesContainer = cast(ensureNotNull(root.querySelector('#onboardingSlides')), HTMLElement);
    this.prevBtn = cast(root.querySelector('#onboardingPrevBtn'), HTMLButtonElement);
    this.nextBtn = cast(root.querySelector('#onboardingNextBtn'), HTMLButtonElement);
    this.slides = Array.from(this.slidesContainer.children);
    this.currentSlideIndex = 0;
    this.hasAlreadyWentToFirstLevel = false;

    this.showSlide(0);
  }

  onShow(): void {
    this.showSlide(0);
  }

  showSlide(idx: number): void {
    this.currentSlideIndex = Math.max(0, Math.min(idx, this.slides.length - 1));
    for (let i = 0; i < this.slides.length; i++) {
      this.slides[i].classList.toggle('variant_shown', i === this.currentSlideIndex);
    }
    this.prevBtn.disabled = this.currentSlideIndex === 0;
    if (this.currentSlideIndex === this.slides.length - 1) {
      this.nextBtn.textContent = 'Play';
    } else {
      this.nextBtn.textContent = 'Next >';
    }
  }

  prev(): void {
    this.showSlide(this.currentSlideIndex - 1);
  }

  next(): void {
    if (this.currentSlideIndex === this.slides.length - 1) {
      if (this.hasAlreadyWentToFirstLevel) {
        appContext.screenManager.switchTo('gameLevelMenu');
      } else {
        // Switch to gameLevelMenu and then right after to game in order to have it
        // in the history stack.
        appContext.screenManager.switchTo('gameLevelMenu');

        let book = appContext.gameLevelMenu.levelMenu.book;
        assert(book !== null);
        appContext.playLevel(book.levels[0], book);
        this.hasAlreadyWentToFirstLevel = true;
      }

      return;
    }
    this.showSlide(this.currentSlideIndex + 1);
  }
}

