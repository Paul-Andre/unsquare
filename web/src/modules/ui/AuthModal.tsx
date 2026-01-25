/** @jsx h */
"use strict";

import { h } from 'dom-chef';
import { cast, ensureNotNull } from '../utils/helpers.ts';
import * as auth from '../utils/auth.ts';
import { Continuation } from 'modules/core/continuations.ts';
import type { User } from '@supabase/supabase-js';

export interface AuthResult {
  user: User | null;
}

export async function showAuthModal(continuations: Continuation[]): Promise<AuthResult> {
    let authModal = new AuthModal();

    document.body.appendChild(authModal.root);
    try {
      const result = await authModal.show(continuations);
      return result;
    } finally {
      authModal.destroy();
      document.body.removeChild(authModal.root);
    }
  }

// TODO: clarify the API of when a null user is returned, and when an
// error is thrown instead.

type ModalView = 'initial' | 'emailEntry' | 'codeEntry';

export class AuthModal {
  root: HTMLElement;
  backdrop: HTMLElement;
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

  constructor() {
    // Create the error message element
    const errorMessage = (
      <div id="authErrorMessage" style={{ display: 'none' }}></div>
    ) as HTMLElement;

    // Create the email error message element
    const emailErrorMessage = (
      <div id="authEmailErrorMessage" style={{ display: 'none' }}></div>
    ) as HTMLElement;

    // Create the OTP error message element
    const otpErrorMessage = (
      <div id="authOTPErrorMessage" style={{ display: 'none' }}></div>
    ) as HTMLElement;

    // Create email input
    const emailInput = (
      <input
        type="email"
        id="authEmailInput"
        required
        placeholder="you@example.com"
      />
    ) as HTMLInputElement;

    // Create OTP input
    const otpInput = (
      <input
        type="text"
        id="authOTPInput"
        required
        maxLength={6}
        placeholder="000000"
      />
    ) as HTMLInputElement;

    // Create buttons
    const closeButton = (
      <button id="authCloseButton" class="authCloseButton" aria-label="Close">
        ×
      </button>
    ) as HTMLButtonElement;

    const googleButton = (
      <button id="authGoogleButton" class="gsi-material-button">
        <div class="gsi-material-button-state"></div>
        <div class="gsi-material-button-content-wrapper">
          <div class="gsi-material-button-icon">
            <svg
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 48 48"
              xmlns:xlink="http://www.w3.org/1999/xlink"
              style={{ display: 'block', overflow: 'visible' }}
            >
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              ></path>
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              ></path>
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              ></path>
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              ></path>
              <path fill="none" d="M0 0h48v48H0z"></path>
            </svg>
          </div>
          <span class="gsi-material-button-contents">Sign in with Google</span>
          <span style={{ display: 'none' }}>Sign in with Google</span>
        </div>
      </button>
    ) as HTMLButtonElement;

    const emailButton = (
      <button id="authEmailButton" type="button">
        Sign in with Email
      </button>
    ) as HTMLButtonElement;

    const skipLink = (
      <a href="#" id="authSkipLink">
        Skip
      </a>
    ) as HTMLElement;

    const emailBackLink = (
      <a href="#" id="authEmailBackLink">
        ← Back to sign in
      </a>
    ) as HTMLElement;

    const otpBackLink = (
      <a href="#" id="authOTPBackLink">
        ← Back
      </a>
    ) as HTMLElement;

    const otpResendLink = (
      <a href="#" id="authOTPResendLink">
        Resend
      </a>
    ) as HTMLElement;

    // Create initial view
    const initialView = (
      <div id="authInitialView">
        <h1>Sign In</h1>
        {errorMessage}
        <div style={{ marginBottom: '0.5em' }}>
          {googleButton}
        </div>
        <div style={{ marginBottom: '0.6em' }} hidden>
          {emailButton}
        </div>
        <div style={{ marginTop: '0.6em', textAlign: 'center' }} hidden>
          {skipLink}
        </div>
      </div>
    ) as HTMLElement;

    // Create email form
    const emailForm = (
      <form id="authEmailForm" style={{ display: 'none' }}>
        <h1>Sign In with Email</h1>
        {emailErrorMessage}
        <div style={{ marginBottom: '0.6em' }}>
          <label for="authEmailInput" style={{ display: 'block', marginBottom: '0.3em' }}>
            Email
          </label>
          {emailInput}
        </div>
        <div>
          <button type="submit">Continue</button>
        </div>
        <div style={{ marginTop: '0.8em', textAlign: 'center' }}>
          {emailBackLink}
        </div>
      </form>
    ) as HTMLFormElement;

    // Create OTP form
    const otpForm = (
      <form id="authOTPForm" style={{ display: 'none' }}>
        <h1>Link Sent</h1>
        {otpErrorMessage}
        <p>Check your email for a link to sign in.</p>
        <div style={{ marginBottom: '0.6em' }} hidden>
          <label for="authOTPInput" style={{ display: 'block', marginBottom: '0.3em' }}>
            Verification Code
          </label>
          {otpInput}
        </div>
        <div hidden>
          <button type="submit">Verify Code</button>
        </div>
        <div style={{ marginTop: '0.8em', textAlign: 'center' }}>
          {otpBackLink}
          <span style={{ color: '#ccc', margin: '0 0.4em' }}>|</span>
          {otpResendLink}
        </div>
      </form>
    ) as HTMLFormElement;

    // Create backdrop
    const backdrop = <div class="authModalBackdrop"></div> as HTMLElement;

    // Create the main modal structure
    const modalContent = (
      <div class="authModalContent">
        {closeButton}
        {initialView}
        {emailForm}
        {otpForm}
      </div>
    ) as HTMLElement;

    const root = (
      <div id="authModal" class="authModalOverlay modal" style={{ display: 'none' }}>
        {backdrop}
        {modalContent}
      </div>
    ) as HTMLElement;


    // Store references
    this.root = root;
    this.backdrop = backdrop;
    this.initialView = initialView;
    this.emailForm = emailForm;
    this.otpForm = otpForm;
    this.emailInput = emailInput;
    this.otpInput = otpInput;
    this.errorMessage = errorMessage;
    this.emailErrorMessage = emailErrorMessage;
    this.otpErrorMessage = otpErrorMessage;
    this.closeButton = closeButton;
    this.googleButton = googleButton;
    this.emailButton = emailButton;
    this.skipLink = skipLink;
    this.emailBackLink = emailBackLink;
    this.otpBackLink = otpBackLink;
    this.otpResendLink = otpResendLink;

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

  private getErrorMessage(err: unknown, fallback: string = 'An unexpected error occurred. Please try again.'): string {
    return err instanceof Error ? err.message : fallback;
  }

  private cleanupAuthPromise(rejectWithError?: Error): void {
    if (rejectWithError && this.rejectAuth) {
      this.rejectAuth(rejectWithError);
    }
    this.resolveAuth = null;
    this.rejectAuth = null;
  }

  showError(message: string, target?: 'initial' | 'email' | 'otp'): void {
    console.error('Auth error:', message);
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
      }
    });
  }

  async handleGoogleSignIn(): Promise<void> {
    this.clearAllErrors();
    this.setLoading(true);
    try {
      const { error } = await auth.handleGoogleSignInFlow(this.continuations);
      if (error) {
        this.showError(error.message || 'Failed to sign in with Google. Please try again.');
        this.setLoading(false);
      }
      // OAuth redirects away, so we don't need to handle success here
    } catch (err) {
      this.showError(this.getErrorMessage(err));
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
      const result = await auth.handleEmailSignInFlow(email, this.continuations);
      if (!result.success) {
        this.showError(result.error?.message || 'Failed to send verification code. Please try again.', 'email');
        this.setLoading(false);
      } else {
        // Success - show code entry form
        this.pendingEmail = email;
        this.showCodeEntry();
        this.setLoading(false);
      }
    } catch (err) {
      this.showError(this.getErrorMessage(err), 'email');
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
      this.showError(this.getErrorMessage(err), 'otp');
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
      this.showError(this.getErrorMessage(err), 'otp');
      this.setLoading(false);
    }
  }

  async handleSkip(): Promise<void> {
    this.setLoading(true);
    try {
      const { user, error } = await auth.handleSkipFlow();
      this.setLoading(false);

      if (error) {
        this.hide();
        this.cleanupAuthPromise(new Error('Anonymous sign-in failed'));
      } else if (user) {
        await this.onAuthSuccess(user);
      }
    } catch (err) {
      this.setLoading(false);
      this.hide();
      this.cleanupAuthPromise(new Error(this.getErrorMessage(err, 'An unexpected error occurred')));
    }
  }

  async onAuthSuccess(user: User): Promise<void> {
    this.setLoading(false);
    this.hide();

    if (this.resolveAuth) {
      this.resolveAuth({ user });
      this.cleanupAuthPromise();
    }
  }

  show(continuations: Continuation[]): Promise<AuthResult> {
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
    requestAnimationFrame(() => {
      this.root.classList.add('showing');
    });

    // Return a promise that resolves when user authenticates or skips
    return new Promise((resolve, reject) => {
      this.resolveAuth = resolve;
      this.rejectAuth = reject;
    });
  }

  close(): void {
    this.hide();
    this.cleanupAuthPromise(new Error('Authentication cancelled'));
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

  destroy(): void {
    // TODO: remove event listeners.
  }

}
