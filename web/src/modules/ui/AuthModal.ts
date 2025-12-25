"use strict";

import { cast, ensureNotNull } from '../utils/helpers.ts';
import * as auth from '../utils/auth.ts';
import { Continuation, processContinuations } from 'modules/core/continuations.ts';
import type { User } from '@supabase/supabase-js';

export interface AuthResult {
  user: User | null;
  skipped: boolean;
}

type ModalView = 'initial' | 'emailEntry' | 'codeEntry';

export class AuthModal {
  root: HTMLElement;
  backdrop: HTMLElement;
  modalContent: HTMLElement;
  initialView: HTMLElement;
  emailForm: HTMLFormElement;
  otpForm: HTMLFormElement;
  emailInput: HTMLInputElement;
  otpInput: HTMLInputElement;
  errorMessage: HTMLElement;
  emailErrorMessage: HTMLElement;
  otpErrorMessage: HTMLElement;
  closeButton: HTMLButtonElement;
  googleButton: HTMLButtonElement;
  emailButton: HTMLButtonElement;
  skipLink: HTMLElement;
  emailBackLink: HTMLElement;
  otpBackLink: HTMLElement;
  otpResendLink: HTMLElement;
  currentView: ModalView = 'initial';
  resolveAuth: ((result: AuthResult) => void) | null = null;
  rejectAuth: ((error: any) => void) | null = null;
  continuations: Continuation[] = [];
  pendingEmail: string = '';

  constructor(root: HTMLElement) {
    this.root = root;
    this.backdrop = cast(ensureNotNull(root.querySelector('.authModalBackdrop')), HTMLElement);
    this.modalContent = cast(ensureNotNull(root.querySelector('.authModalContent')), HTMLElement);
    this.initialView = cast(ensureNotNull(root.querySelector('#authInitialView')), HTMLElement);
    this.emailForm = cast(ensureNotNull(root.querySelector('#authEmailForm')), HTMLFormElement);
    this.otpForm = cast(ensureNotNull(root.querySelector('#authOTPForm')), HTMLFormElement);
    this.emailInput = cast(ensureNotNull(root.querySelector('#authEmailInput')), HTMLInputElement);
    this.otpInput = cast(ensureNotNull(root.querySelector('#authOTPInput')), HTMLInputElement);
    this.errorMessage = cast(ensureNotNull(root.querySelector('#authErrorMessage')), HTMLElement);
    this.emailErrorMessage = cast(ensureNotNull(root.querySelector('#authEmailErrorMessage')), HTMLElement);
    this.otpErrorMessage = cast(ensureNotNull(root.querySelector('#authOTPErrorMessage')), HTMLElement);
    this.closeButton = cast(ensureNotNull(root.querySelector('#authCloseButton')), HTMLButtonElement);
    this.googleButton = cast(ensureNotNull(root.querySelector('#authGoogleButton')), HTMLButtonElement);
    this.emailButton = cast(ensureNotNull(root.querySelector('#authEmailButton')), HTMLButtonElement);
    this.skipLink = cast(ensureNotNull(root.querySelector('#authSkipLink')), HTMLElement);
    this.emailBackLink = cast(ensureNotNull(root.querySelector('#authEmailBackLink')), HTMLElement);
    this.otpBackLink = cast(ensureNotNull(root.querySelector('#authOTPBackLink')), HTMLElement);
    this.otpResendLink = cast(ensureNotNull(root.querySelector('#authOTPResendLink')), HTMLElement);
    
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

    // Google OAuth button
    this.googleButton.addEventListener('click', async (e) => {
      e.preventDefault();
      await this.handleGoogleSignIn();
    });

    // Email button
    this.emailButton.addEventListener('click', (e) => {
      e.preventDefault();
      this.showEmailEntry();
    });

    // Skip link
    this.skipLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.handleSkip();
    });

    // Email form submission
    this.emailForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleEmailSubmit();
    });

    // OTP form submission
    this.otpForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleOTPSubmit();
    });

    // Back links
    this.emailBackLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.showInitial();
    });

    this.otpBackLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.showEmailEntry();
    });

    // Resend OTP link
    this.otpResendLink.addEventListener('click', async (e) => {
      e.preventDefault();
      await this.handleResendOTP();
    });
  }

  showInitial(): void {
    this.currentView = 'initial';
    this.initialView.style.display = 'block';
    this.emailForm.style.display = 'none';
    this.otpForm.style.display = 'none';
    this.clearAllErrors();
  }

  showEmailEntry(): void {
    this.currentView = 'emailEntry';
    this.initialView.style.display = 'none';
    this.emailForm.style.display = 'block';
    this.otpForm.style.display = 'none';
    this.clearAllErrors();
  }

  showCodeEntry(): void {
    this.currentView = 'codeEntry';
    this.initialView.style.display = 'none';
    this.emailForm.style.display = 'none';
    this.otpForm.style.display = 'block';
    this.clearAllErrors();
  }

  showError(message: string, target?: 'initial' | 'email' | 'otp'): void {
    const targetElement = target === 'email' ? this.emailErrorMessage : 
                         target === 'otp' ? this.otpErrorMessage : 
                         this.errorMessage;
    targetElement.textContent = message;
    targetElement.style.display = 'block';
  }

  clearAllErrors(): void {
    this.errorMessage.textContent = '';
    this.errorMessage.style.display = 'none';
    this.emailErrorMessage.textContent = '';
    this.emailErrorMessage.style.display = 'none';
    this.otpErrorMessage.textContent = '';
    this.otpErrorMessage.style.display = 'none';
  }

  setLoading(loading: boolean): void {
    const buttons = this.root.querySelectorAll('button[type="submit"], #authEmailButton, #authGoogleButton');
    buttons.forEach((btn) => {
      if (btn instanceof HTMLButtonElement) {
        btn.disabled = loading;
        if (loading && btn.type === 'submit') {
          const originalText = btn.textContent;
          btn.dataset.originalText = originalText || '';
          btn.textContent = 'Loading...';
        } else if (!loading && btn.dataset.originalText) {
          btn.textContent = btn.dataset.originalText;
          delete btn.dataset.originalText;
        }
      }
    });
  }

  async handleGoogleSignIn(): Promise<void> {
    this.clearAllErrors();
    this.setLoading(true);
    try {
      const { error } = await auth.signInWithOAuth('google', this.continuations);
      if (error) {
        this.showError(error.message || 'Google sign in failed. Please try again.');
        this.setLoading(false);
      }
      // OAuth redirects away, so we don't need to handle success here
    } catch (err) {
      this.showError('An unexpected error occurred. Please try again.');
      this.setLoading(false);
    }
  }

  async handleEmailSubmit(): Promise<void> {
    this.clearAllErrors();
    const email = this.emailInput.value.trim();

    if (!email) {
      this.showError('Please enter your email', 'email');
      return;
    }

    this.setLoading(true);
    try {
      const { error } = await auth.signInWithMagicLink(email, this.continuations);
      if (error) {
        this.showError(error.message || 'Failed to send magic link. Please try again.', 'email');
        this.setLoading(false);
      } else {
        // Success - show code entry form
        this.pendingEmail = email;
        this.showCodeEntry();
        this.setLoading(false);
      }
    } catch (err) {
      this.showError('An unexpected error occurred. Please try again.', 'email');
      this.setLoading(false);
    }
  }

  async handleOTPSubmit(): Promise<void> {
    this.clearAllErrors();
    const token = this.otpInput.value.trim();

    if (!token) {
      this.showError('Please enter the verification code', 'otp');
      return;
    }

    if (!this.pendingEmail) {
      this.showError('Email not found. Please start over.', 'otp');
      this.showInitial();
      return;
    }

    this.setLoading(true);
    try {
      const { user, error } = await auth.verifyOTP(this.pendingEmail, token);
      if (error) {
        this.showError(error.message || 'Invalid code. Please try again.', 'otp');
        this.setLoading(false);
      } else if (user) {
        await this.onAuthSuccess(user);
      }
    } catch (err) {
      this.showError('An unexpected error occurred. Please try again.', 'otp');
      this.setLoading(false);
    }
  }

  async handleResendOTP(): Promise<void> {
    if (!this.pendingEmail) {
      this.showError('Email not found. Please start over.', 'otp');
      this.showInitial();
      return;
    }

    this.setLoading(true);
    try {
      const { error } = await auth.signInWithMagicLink(this.pendingEmail, this.continuations);
      if (error) {
        this.showError(error.message || 'Failed to resend code. Please try again.', 'otp');
      } else {
        this.showError('Code resent! Check your email.', 'otp');
        this.otpErrorMessage.style.color = '#2da6fd';
      }
      this.setLoading(false);
    } catch (err) {
      this.showError('An unexpected error occurred. Please try again.', 'otp');
      this.setLoading(false);
    }
  }

  handleSkip(): void {
    this.hide();
    
    // Resolve with skipped = true
    // Don't process continuations here - let the caller (ensureAuthenticated) handle it
    // to avoid double-processing
    if (this.resolveAuth) {
      this.resolveAuth({ user: null, skipped: true });
      this.resolveAuth = null;
      this.rejectAuth = null;
    }
  }

  async onAuthSuccess(user: User): Promise<void> {
    this.setLoading(false);
    this.hide();

    // Resolve the promise if there's one waiting
    if (this.resolveAuth) {
      this.resolveAuth({ user, skipped: false });
      this.resolveAuth = null;
      this.rejectAuth = null;
    }
  }

  show(continuations: Continuation[]): Promise<AuthResult> {
    console.log('AuthModal.show() called', this.root);
    this.clearAllErrors();
    this.continuations = continuations;
    this.currentView = 'initial';
    this.pendingEmail = '';
    
    // Clear form inputs
    this.emailInput.value = '';
    this.otpInput.value = '';
    this.showInitial();

    // Show the overlay
    this.root.style.display = 'block';
    console.log('Modal display set to block, adding showing class');
    requestAnimationFrame(() => {
      this.root.classList.add('showing');
      console.log('Showing class added, modal should be visible now');
    });

    // Return a promise that resolves when user authenticates or skips
    return new Promise((resolve, reject) => {
      this.resolveAuth = resolve;
      this.rejectAuth = reject;
    });
  }

  close(): void {
    this.hide();

    // Reject the promise if it's still pending
    if (this.rejectAuth) {
      this.rejectAuth(new Error('Authentication cancelled'));
      this.resolveAuth = null;
      this.rejectAuth = null;
    }
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
