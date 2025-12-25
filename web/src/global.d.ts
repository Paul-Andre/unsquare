// Global type declarations for properties added to window/globalThis
// These are set in main.ts and used from HTML onclick handlers and console

import { AppContext } from './modules/core/AppContext.ts';
import { checkAndOpenCustomLevel } from './modules/ui/openInitial.ts';
import * as config from './modules/utils/config.ts';
import * as algo from './modules/core/algo.ts';
import { testCheckout, createCheckoutSession, CreateCheckoutSessionOptions } from './modules/utils/stripe.ts';
import { supabase } from './modules/utils/api.ts';
import { auth } from './modules/utils/auth.ts';

declare global {
  interface Window {
    config: typeof config;
    appContext: AppContext;
    gtag?: (...args: any[]) => void;
    posthog?: {
      capture: (event: string, properties?: Record<string, any>) => void;
    };
    algo: typeof algo;
    testCheckout: typeof testCheckout;
    createCheckoutSession: typeof createCheckoutSession;
    supabase: typeof supabase;
    auth: typeof auth;
  }
}

export {};

