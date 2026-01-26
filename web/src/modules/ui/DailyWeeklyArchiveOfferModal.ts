"use strict";

import { cast, ensureNotNull } from '../utils/helpers.ts';
import { Continuation } from 'modules/core/Continuation.ts';
import { authenticateAndPurchaseDailyWeeklyArchive, authenticateAndPurchaseFullAccess, ensureAuthenticated } from '../utils/stripe.ts';
import { getCurrentUser, signOut } from 'modules/utils/auth.ts';
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
  emailSpan: HTMLElement;
  loggedInAsSection: HTMLElement;
  logOutButton: HTMLElement;


  continuations: Continuation[] = [];

  constructor(root: HTMLElement) {
    this.root = root;
    this.backdrop = cast((root.querySelector('.dailyWeeklyArchiveOfferModalBackdrop')), HTMLElement);
    this.modalContent = cast((root.querySelector('.dailyWeeklyArchiveOfferModalContent')), HTMLElement);
    this.closeButton = cast((root.querySelector('#dailyWeeklyArchiveOfferCloseButton')), HTMLButtonElement);
    this.fiveDollarButton = cast((root.querySelector('#dailyWeeklyArchiveOfferFiveDollarButton')), HTMLButtonElement);
    this.twentyDollarButton = cast((root.querySelector('#dailyWeeklyArchiveOfferTwentyDollarButton')), HTMLButtonElement);
    this.alreadyPurchasedSection = cast((root.querySelector('.dailyWeeklyArchiveOfferAlreadyPurchased')), HTMLElement);
    this.logInButton = cast((root.querySelector('#dailyWeeklyArchiveOfferLogIn')), HTMLElement);
    this.logOutButton = cast((root.querySelector('#dailyWeeklyArchiveOfferLogOut')), HTMLElement);
    this.emailSpan = cast((root.querySelector('#dailyWeeklyArchiveOfferLoggedInAs')), HTMLElement);
    this.loggedInAsSection = cast((root.querySelector('.dailyWeeklyArchiveOfferLoggedInAs')), HTMLElement);

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

    this.logOutButton.addEventListener('click', async () => {
      await signOut();
      this.show(this.continuations);
    })
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
      let email = null;
      if (user !== null) {
        if (user.email === undefined) {
          console.warn("Logged in as user without email");
        } else {
          email = user.email;
        }
      }
      if (email === null) {
        this.alreadyPurchasedSection.hidden = false;
        this.loggedInAsSection.hidden = true;
      } else {
        this.alreadyPurchasedSection.hidden = true;
        this.loggedInAsSection.hidden = false;
        this.emailSpan.innerText = email;
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

