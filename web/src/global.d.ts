// Global type declarations for properties added to window/globalThis
// These are set in main.js and used from HTML onclick handlers and console

import { Game } from './modules/game/Game.js';
import { editor } from './modules/game/Editor.js';
import { screenManager } from './modules/ui/ScreenManager.js';
import { bookMenu } from './modules/ui/BookMenu.js';
import { gameLevelMenu } from './modules/ui/GameLevelMenu.js';
import { editorLevelMenu } from './modules/ui/editorLevelMenu.js';
import { checkAndOpenCustomLevel } from './modules/utils/customParse.ts';
import * as config from './modules/utils/config.ts';
import * as algo from './modules/core/algo.ts';

declare global {
  interface Window {
    config: typeof config;
    game: Game;
    editor: typeof editor;
    screenManager: typeof screenManager;
    bookMenu: typeof bookMenu;
    gameLevelMenu: typeof gameLevelMenu;
    editorLevelMenu: typeof editorLevelMenu;
    parseCustomLevel: typeof checkAndOpenCustomLevel;
    openEditor: () => void;
    openPlayerEditor: () => void;
    onboardingPrev: () => void;
    onboardingNext: () => void;
    gtag?: (...args: any[]) => void;
    posthog?: {
      capture: (event: string, properties?: Record<string, any>) => void;
    };
    algo: typeof algo;
    
  }
}

export {};

