"use strict";

import { getCurrentUser } from './auth.ts';
import { appContext } from '../core/AppContext.ts';

/**
 * Ensures the user is authenticated before proceeding with a paid feature.
 * If not authenticated, shows the auth modal and waits for authentication.
 * Returns the authenticated user.
 * 
 * @returns Promise that resolves with the authenticated user
 * @throws Error if authentication is cancelled or fails
 */
export async function ensureAuthenticated() {
  // Check if already authenticated
  const user = await getCurrentUser();
  if (user) {
    return user;
  }

  // If no user authenticated, show auth modal and wait for authentication
  try {
    const user = await appContext.authModal.show();
    return user;
  } catch (error) {
    console.error('Authentication required for this feature', error);
    throw new Error('Authentication required for this feature');
  }
}


