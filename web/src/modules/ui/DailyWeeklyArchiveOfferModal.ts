"use strict";

import { cast, ensureNotNull } from '../utils/helpers.ts';
import { Continuation } from 'modules/core/continuations.ts';
import { purchaseDailyWeeklyArchive } from '../utils/stripe.ts';

export class DailyWeeklyArchiveOfferModal {
  root: HTMLElement;
  backdrop: HTMLElement;
  modalContent: HTMLElement;
  closeButton: HTMLButtonElement;
  fiveDollarButton: HTMLButtonElement;
  twentyDollarButton: HTMLButtonElement;
  continuations: Continuation[] = [];

  constructor(root: HTMLElement) {
    this.root = root;
    this.backdrop = cast(ensureNotNull(root.querySelector('.dailyWeeklyArchiveOfferModalBackdrop')), HTMLElement);
    this.modalContent = cast(ensureNotNull(root.querySelector('.dailyWeeklyArchiveOfferModalContent')), HTMLElement);
    this.closeButton = cast(ensureNotNull(root.querySelector('#dailyWeeklyArchiveOfferCloseButton')), HTMLButtonElement);
    this.fiveDollarButton = cast(ensureNotNull(root.querySelector('#dailyWeeklyArchiveOfferFiveDollarButton')), HTMLButtonElement);
    this.twentyDollarButton = cast(ensureNotNull(root.querySelector('#dailyWeeklyArchiveOfferTwentyDollarButton')), HTMLButtonElement);
    
    this.setupEventListeners();
  }

  setupEventListeners(): void {
    // Close button
    this.closeButton.addEventListener('click', () => this.close());

    // Backdrop click to close
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) {
        this.close();
      }
    });

    // $5 button
    this.fiveDollarButton.addEventListener('click', async () => {
      await this.handleFiveDollarPurchase();
    });

    // $20 button (placeholder)
    this.twentyDollarButton.addEventListener('click', () => {
      this.handleTwentyDollarPurchase();
    });
  }

  async handleFiveDollarPurchase(): Promise<void> {
    this.fiveDollarButton.disabled = true;
    try {
      // Hide the offer modal before showing auth modal (if needed)
      // This prevents the offer modal from covering the auth modal
      this.hide();
      await purchaseDailyWeeklyArchive(this.continuations);
    } catch (error) {
      console.error('Purchase failed:', error);
      // Re-show the offer modal if purchase failed
      this.show(this.continuations);
      this.fiveDollarButton.disabled = false;
    }
  }

  handleTwentyDollarPurchase(): void {
    // Placeholder for future implementation
    console.log('$20 purchase option clicked (not yet implemented)');
  }

  show(continuations: Continuation[]): void {
    this.continuations = continuations;
    
    // Show the overlay
    this.root.style.display = 'block';
    requestAnimationFrame(() => {
      this.root.classList.add('showing');
    });
  }

  close(): void {
    this.hide();
  }

  hide(): void {
    this.root.classList.remove('showing');
    setTimeout(() => {
      this.root.style.display = 'none';
    }, 200); // Match animation duration
  }

  isVisible(): boolean {
    return this.root.style.display !== 'none' && this.root.classList.contains('showing');
  }
}

