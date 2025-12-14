// Global type declarations for properties added to window/globalThis
// These are set in main.ts and used from HTML onclick handlers and console

import { AppContext } from './modules/core/AppContext.ts';
import { checkAndOpenCustomLevel } from './modules/ui/customParse.ts';
import * as config from './modules/utils/config.ts';
import * as algo from './modules/core/algo.ts';

declare global {
  interface Window {
    config: typeof config;
    appContext: AppContext;
    gtag?: (...args: any[]) => void;
    posthog?: {
      capture: (event: string, properties?: Record<string, any>) => void;
    };
    algo: typeof algo;
    
  }
}

export {};

