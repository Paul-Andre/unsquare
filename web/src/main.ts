// Main entry point for the application
import { appContext } from './modules/core/AppContext.ts';
import { checkAndOpenCustomLevel } from './modules/ui/customParse.ts';
import * as config from './modules/utils/config.ts';
import * as algo from './modules/core/algo';
import { assert, cast, generate_id } from './modules/utils/helpers.ts';
import { onAuthStateChange, getCurrentUser } from './modules/utils/auth.ts';
import { supabase } from './modules/utils/api.ts';
import { testCheckout, createCheckoutSession } from './modules/utils/stripe.ts';
import * as auth from './modules/utils/auth.ts'
import { purchaseDailyWeeklyArchive } from './modules/core/shop.ts';

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


// Parse custom level if present in URL
let openedCustom = checkAndOpenCustomLevel();


const url = new URL(window.location.href);
const continuations = url.searchParams.get("continuations");
if (continuations) {
  continuations.split(",").forEach(continuation => {
    if (continuation === "purchaseDailyWeeklyArchive") {
      purchaseDailyWeeklyArchive();
    }
  });
}

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


// Initial screen selection based on user experience
(function setupInitialScreen() {
  let num_levels_done = 0;
  for (let key in localStorage) {
    if (key.startsWith("level_") && key.endsWith("bestNumMoves")) {
      num_levels_done += 1;
    }
  }

  let had_experience = num_levels_done >= 5;

  if (openedCustom) {
    // pass; It was already opened by the checkAndOpenCustomLevel function.
  } else if (had_experience) {
    appContext.openingInstructions.hasAlreadyWentToFirstLevel = true;
    appContext.screenManager.switchTo('gameLevelMenu');
  } else {
    appContext.screenManager.switchTo('opening_instructions');
  }
})();

if (localStorage.getItem("player_id") === null) {
  let player_id = generate_id("anon");
  localStorage.setItem("player_id", player_id);
}

// 8-click to get into editor mode.
(function setupTitleEasterEgg() {
  const titleElement = document.getElementById("homeTitle");
  if (!titleElement) return;

  let clickCount = 0;
  let resetTimeout: NodeJS.Timeout | null = null;
  const REQUIRED_CLICKS = 8;
  const RESET_DELAY = 2000; // 2 seconds

  function resetCounter() {
    clickCount = 0;
    if (resetTimeout) {
      clearTimeout(resetTimeout);
      resetTimeout = null;
    }
  }

  function handleClick() {
    clickCount++;
    
    // Clear existing timeout
    if (resetTimeout) {
      clearTimeout(resetTimeout);
    }
    
    // Set new timeout to reset counter
    resetTimeout = setTimeout(resetCounter, RESET_DELAY);
    
    // Check if we've reached the required number of clicks
    if (clickCount >= REQUIRED_CLICKS) {
      resetCounter();
      appContext.openEditor();
    }
  }

  // Support both click and touch events
  titleElement.addEventListener("click", handleClick);
  titleElement.addEventListener("touchend", function(e) {
    e.preventDefault();
    handleClick();
  });

})();
