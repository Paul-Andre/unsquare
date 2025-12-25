"use strict";

import { cast, ensureNotNull } from '../utils/helpers.ts';

export class RedirectingToPaymentModal {
  root: HTMLElement;
  backdrop: HTMLElement;
  modalContent: HTMLElement;

  constructor(root: HTMLElement) {
    this.root = root;
    this.backdrop = cast(ensureNotNull(root.querySelector('.redirectingToPaymentModalBackdrop')), HTMLElement);
    this.modalContent = cast(ensureNotNull(root.querySelector('.redirectingToPaymentModalContent')), HTMLElement);
  }

  show(): void {
    // Show the overlay
    this.root.style.display = 'block';
    requestAnimationFrame(() => {
      this.root.classList.add('showing');
    });
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

