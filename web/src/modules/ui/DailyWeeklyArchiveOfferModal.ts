"use strict";

import { cast, ensureNotNull } from '../utils/helpers.ts';
import { Continuation } from 'modules/core/continuations.ts';
import { authenticateAndPurchaseDailyWeeklyArchive, authenticateAndPurchaseFullAccess, ensureAuthenticated } from '../utils/stripe.ts';
import { getCurrentUser } from 'modules/utils/auth.ts';
import { appContext } from 'modules/core/AppContext.ts';

export class DailyWeeklyArchiveOfferModal {
  root: HTMLElement;
  backdrop: HTMLElement;
  modalContent: HTMLElement;
  closeButton: HTMLButtonElement;
  fiveDollarButton: HTMLButtonElement;
  twentyDollarButton: HTMLButtonElement;
  alreadyPurchasedSection: HTMLElement;
  logInButton: HTMLElement;

  continuations: Continuation[] = [];

  constructor(root: HTMLElement) {
    this.root = root;
    this.backdrop = cast((root.querySelector('.dailyWeeklyArchiveOfferModalBackdrop')), HTMLElement);
    this.modalContent = cast((root.querySelector('.dailyWeeklyArchiveOfferModalContent')), HTMLElement);
    this.closeButton = cast((root.querySelector('#dailyWeeklyArchiveOfferCloseButton')), HTMLButtonElement);
    this.fiveDollarButton = cast((root.querySelector('#dailyWeeklyArchiveOfferFiveDollarButton')), HTMLButtonElement);
    this.twentyDollarButton = cast((root.querySelector('#dailyWeeklyArchiveOfferTwentyDollarButton')), HTMLButtonElement);
    this.alreadyPurchasedSection = cast((root.querySelector('.dailyWeeklyArchiveOfferAlreadyPurchased')), HTMLElement);
    this.logInButton = cast((root.querySelector('.dailyWeeklyArchiveOfferAlreadyPurchased a')), HTMLElement);

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
    this.twentyDollarButton.addEventListener('click', async () => {
      await this.handleTwentyDollarPurchase();
    });

    this.logInButton.addEventListener('click', async () => {
      this.hide();
      let user = await ensureAuthenticated(this.continuations);
      if (user === null) {
        this.show(this.continuations);
      }
    });
  }

  // TODO: 

  async handleFiveDollarPurchase(): Promise<void> {
    // this.fiveDollarButton.disabled = true;
    try {
      // Hide the offer modal before showing auth modal (if needed)
      // This prevents the offer modal from covering the auth modal
      this.hide();
      await authenticateAndPurchaseDailyWeeklyArchive(this.continuations);
    } catch (error) {
      console.error('Purchase failed:', error);
      // Re-show the offer modal if purchase failed
      this.show(this.continuations);
    }
  }

  async handleTwentyDollarPurchase(): Promise<void> {
    // this.twentyDollarButton.disabled = true;
    try {
      // Hide the offer modal before showing auth modal (if needed)
      // This prevents the offer modal from covering the auth modal
      this.hide();
      await authenticateAndPurchaseFullAccess(this.continuations);
    } catch (error) {
      console.error('Purchase failed:', error);
      // Re-show the offer modal if purchase failed
      this.show(this.continuations);
    }
  }

  show(continuations: Continuation[]): void {
    this.continuations = continuations;
    
    // Show the overlay
    this.root.style.display = 'block';
    requestAnimationFrame(() => {
      this.root.classList.add('showing');
    });
    (async () =>{
      let user = await getCurrentUser();
      if (user === null) {
        this.alreadyPurchasedSection.hidden = false;
      } else {
        this.alreadyPurchasedSection.hidden = true;
      }
    })();
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

