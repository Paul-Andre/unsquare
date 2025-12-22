"use strict";

import { cast, ensureNotNull } from '../utils/helpers.ts';
import * as auth from '../utils/auth.ts';

export class AuthModal {
  root: HTMLElement;
  backdrop: HTMLElement;
  modalContent: HTMLElement;
  signInForm: HTMLFormElement;
  signUpForm: HTMLFormElement;
  signInEmailInput: HTMLInputElement;
  signInPasswordInput: HTMLInputElement;
  signUpEmailInput: HTMLInputElement;
  signUpPasswordInput: HTMLInputElement;
  errorMessage: HTMLElement;
  toggleLink: HTMLElement;
  isSignInMode: boolean;
  closeButton: HTMLButtonElement;
  googleButton: HTMLButtonElement;
  resolveAuth: ((user: any) => void) | null = null;
  rejectAuth: ((error: any) => void) | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    this.backdrop = cast(ensureNotNull(root.querySelector('.authModalBackdrop')), HTMLElement);
    this.modalContent = cast(ensureNotNull(root.querySelector('.authModalContent')), HTMLElement);
    this.signInForm = cast(ensureNotNull(root.querySelector('#authSignInForm')), HTMLFormElement);
    this.signUpForm = cast(ensureNotNull(root.querySelector('#authSignUpForm')), HTMLFormElement);
    this.signInEmailInput = cast(ensureNotNull(root.querySelector('#authSignInEmail')), HTMLInputElement);
    this.signInPasswordInput = cast(ensureNotNull(root.querySelector('#authSignInPassword')), HTMLInputElement);
    this.signUpEmailInput = cast(ensureNotNull(root.querySelector('#authSignUpEmail')), HTMLInputElement);
    this.signUpPasswordInput = cast(ensureNotNull(root.querySelector('#authSignUpPassword')), HTMLInputElement);
    this.errorMessage = cast(ensureNotNull(root.querySelector('#authErrorMessage')), HTMLElement);
    this.toggleLink = cast(ensureNotNull(root.querySelector('#authToggleLink')), HTMLElement);
    this.closeButton = cast(ensureNotNull(root.querySelector('#authCloseButton')), HTMLButtonElement);
    this.googleButton = cast(ensureNotNull(root.querySelector('#authGoogleButton')), HTMLButtonElement);
    
    this.isSignInMode = true;
    this.setupEventListeners();
  }

  setupEventListeners(): void {
    // Close button
    this.closeButton.addEventListener('click', () => this.hide());

    // Backdrop click to close
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) {
        this.hide();
      }
    });

    // Toggle between sign in and sign up
    this.toggleLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.toggleMode();
    });

    // Sign in form submission
    this.signInForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSignIn();
    });

    // Sign up form submission
    this.signUpForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSignUp();
    });

    // Google OAuth button
    this.googleButton.addEventListener('click', async (e) => {
      e.preventDefault();
      await this.handleGoogleSignIn();
    });
  }

  toggleMode(): void {
    this.isSignInMode = !this.isSignInMode;
    this.updateFormVisibility();
    this.clearError();
  }

  updateFormVisibility(): void {
    if (this.isSignInMode) {
      this.signInForm.style.display = 'block';
      this.signUpForm.style.display = 'none';
      const toggleText = this.toggleLink.querySelector('span');
      if (toggleText) {
        toggleText.textContent = "Don't have an account? Sign up";
      }
    } else {
      this.signInForm.style.display = 'none';
      this.signUpForm.style.display = 'block';
      const toggleText = this.toggleLink.querySelector('span');
      if (toggleText) {
        toggleText.textContent = 'Already have an account? Sign in';
      }
    }
  }

  showError(message: string): void {
    this.errorMessage.textContent = message;
    this.errorMessage.style.display = 'block';
  }

  clearError(): void {
    this.errorMessage.textContent = '';
    this.errorMessage.style.display = 'none';
  }

  setLoading(loading: boolean): void {
    const buttons = this.root.querySelectorAll('button[type="submit"]');
    buttons.forEach((btn) => {
      if (btn instanceof HTMLButtonElement) {
        btn.disabled = loading;
        if (loading) {
          btn.textContent = 'Loading...';
        } else {
          if (this.isSignInMode) {
            const signInBtn = this.signInForm.querySelector('button[type="submit"]');
            if (signInBtn) signInBtn.textContent = 'Sign In';
          } else {
            const signUpBtn = this.signUpForm.querySelector('button[type="submit"]');
            if (signUpBtn) signUpBtn.textContent = 'Sign Up';
          }
        }
      }
    });
  }

  async handleSignIn(): Promise<void> {
    this.clearError();
    const email = this.signInEmailInput.value.trim();
    const password = this.signInPasswordInput.value;

    if (!email || !password) {
      this.showError('Please enter both email and password');
      return;
    }

    this.setLoading(true);
    try {
      const { user, error } = await auth.signInWithEmail(email, password);
      if (error) {
        this.showError(error.message || 'Sign in failed. Please try again.');
        this.setLoading(false);
      } else if (user) {
        await this.onAuthSuccess(user);
      }
    } catch (err) {
      this.showError('An unexpected error occurred. Please try again.');
      this.setLoading(false);
    }
  }

  async handleSignUp(): Promise<void> {
    this.clearError();
    const email = this.signUpEmailInput.value.trim();
    const password = this.signUpPasswordInput.value;

    if (!email || !password) {
      this.showError('Please enter both email and password');
      return;
    }

    if (password.length < 6) {
      this.showError('Password must be at least 6 characters');
      return;
    }

    this.setLoading(true);
    try {
      const { user, error } = await auth.signUpWithEmail(email, password);
      if (error) {
        this.showError(error.message || 'Sign up failed. Please try again.');
        this.setLoading(false);
      } else if (user) {
        // Check if email confirmation is required
        if (!user.email_confirmed_at) {
          this.showError('Please check your email to confirm your account before signing in.');
          this.setLoading(false);
          // Switch to sign in mode
          this.isSignInMode = true;
          this.updateFormVisibility();
        } else {
          await this.onAuthSuccess(user);
        }
      }
    } catch (err) {
      this.showError('An unexpected error occurred. Please try again.');
      this.setLoading(false);
    }
  }

  async handleGoogleSignIn(): Promise<void> {
    this.clearError();
    this.setLoading(true);
    try {
      const { error } = await auth.signInWithOAuth('google');
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

  async onAuthSuccess(user: any): Promise<void> {
    
    this.setLoading(false);
    this.hide();

    // Resolve the promise if there's one waiting
    if (this.resolveAuth) {
      this.resolveAuth(user);
      this.resolveAuth = null;
      this.rejectAuth = null;
    }
  }

  show(): Promise<any> {
    console.log('AuthModal.show() called', this.root);
    this.clearError();
    this.isSignInMode = true;
    this.updateFormVisibility();
    
    // Clear form inputs
    this.signInEmailInput.value = '';
    this.signInPasswordInput.value = '';
    this.signUpEmailInput.value = '';
    this.signUpPasswordInput.value = '';

    // Show the overlay
    this.root.style.display = 'block';
    console.log('Modal display set to block, adding showing class');
    requestAnimationFrame(() => {
      this.root.classList.add('showing');
      console.log('Showing class added, modal should be visible now');
    });

    // Return a promise that resolves when user authenticates
    return new Promise((resolve, reject) => {
      this.resolveAuth = resolve;
      this.rejectAuth = reject;
    });
  }

  hide(): void {
    this.root.classList.remove('showing');
    setTimeout(() => {
      this.root.style.display = 'none';
    }, 200); // Match animation duration

    // Reject the promise if it's still pending
    if (this.rejectAuth) {
      this.rejectAuth(new Error('Authentication cancelled'));
      this.resolveAuth = null;
      this.rejectAuth = null;
    }
  }

  isVisible(): boolean {
    return this.root.style.display !== 'none' && this.root.classList.contains('showing');
  }
}

