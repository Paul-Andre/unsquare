// Global type declarations for properties added to window/globalThis
// These are set in main.ts and used from HTML onclick handlers and console

import { Game } from './modules/game/Game.ts';
import { editor } from './modules/game/Editor.ts';
import { screenManager } from './modules/ui/ScreenManager.ts';
import { bookMenu } from './modules/ui/BookMenu.ts';
import { gameLevelMenu } from './modules/ui/GameLevelMenu.ts';
import { editorLevelMenu } from './modules/ui/editorLevelMenu.ts';
import { checkAndOpenCustomLevel } from './modules/ui/customParse.ts';
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

