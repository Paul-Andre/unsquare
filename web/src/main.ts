// Main entry point for the application
import { appContext } from './modules/core/AppContext.ts';
import { checkAndOpenCustomLevel, setupInitialScreen } from './modules/ui/openInitial.ts';
import * as config from './modules/utils/config.ts';
import * as algo from './modules/core/algo';
import { assert, cast, generate_id } from './modules/utils/helpers.ts';
import { onAuthStateChange, getCurrentUser } from './modules/utils/auth.ts';
import { supabase } from './modules/utils/api.ts';
import { testCheckout, createCheckoutSession, purchaseDailyWeeklyArchive } from './modules/utils/stripe.ts';
import * as auth from './modules/utils/auth.ts'
import { processContinuations, getUrlContinuations } from 'modules/core/continuations.ts';

// Global configuration
window.config = config;

// Initialize global instances
window.appContext = appContext;

window.algo = algo;

// Expose functions and modules for testing
window.testCheckout = testCheckout;
window.createCheckoutSession = createCheckoutSession;
window.purchaseDailyWeeklyArchive = purchaseDailyWeeklyArchive;
window.auth = auth;
window.supabase = supabase;
window.showDailyWeeklyArchiveOfferModal = () => {
  appContext.dailyWeeklyArchiveOfferModal.show([]);
};
window.showSignInModal = () => {
  appContext.authModal.show([]);
};


// Remove utm parameters from the url
window.addEventListener('load',
  function () {
    setTimeout(function () {
      const url = new URL(window.location.href);
      url.searchParams.forEach((value, key) => {
        if (key.startsWith('utm_')) {
          url.searchParams.delete(key);
        }
      });
      window.history.replaceState({}, '', url.toString());
    }, 5000);
  });

setupInitialScreen();

if (localStorage.getItem("player_id") === null) {
  let player_id = generate_id("anon");
  localStorage.setItem("player_id", player_id);
}

// TODO: I'm not sure what this block does (was added/changed by AI and I missed reviewing it)
// Handle magic link redirects - check for continuations in URL after auth
onAuthStateChange(async (user) => {
  if (user) {
    // User just authenticated, check for continuations in URL
    const continuations = getUrlContinuations();
    if (continuations.length > 0) {
      // Process continuations after a short delay to ensure session is fully established
      setTimeout(() => {
        processContinuations(continuations);
        // Clean up URL
        const url = new URL(window.location.href);
        url.searchParams.delete('continuations');
        // Also clean up hash if it contains auth tokens
        if (url.hash.includes('access_token') || url.hash.includes('type=recovery')) {
          url.hash = '';
        }
        window.history.replaceState({}, '', url.toString());
      }, 100);
    }
  }
});