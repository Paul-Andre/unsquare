"use strict";

import { cast, ensureNotNull } from '../utils/helpers.ts';
import { Game } from '../game/Game.ts';
import { Editor } from '../game/Editor.ts';
import { ScreenManager } from '../ui/ScreenManager.ts';
import { BookMenu } from '../ui/BookMenu.ts';
import { GameLevelMenu } from '../ui/GameLevelMenu.ts';
import { LevelMenuComponent } from '../ui/LevelMenuComponent.ts';
import { Level } from '../core/Level.ts';
import { createEditorLevelMenu } from '../ui/editorLevelMenu.ts';

export class AppContext {
  game: Game;
  editor: Editor;
  screenManager: ScreenManager;
  bookMenu: BookMenu;
  gameLevelMenu: GameLevelMenu;
  editorLevelMenu: LevelMenuComponent;

  constructor() {
    // Create screenManager first (no DOM queries needed)
    this.screenManager = new ScreenManager();

    // Create game instance
    const gameRoot = ensureNotNull(document.getElementById("game"));
    const gameCanvas = cast(gameRoot.querySelector("#gameCanvas"), HTMLCanvasElement);
    this.game = new Game(gameRoot, gameCanvas);

    // Create editor instance
    const editorRoot = ensureNotNull(document.getElementById("editor"));
    const editorCanvas = cast(editorRoot.querySelector("#editorCanvas"), HTMLCanvasElement);
    this.editor = new Editor(editorRoot, editorCanvas);

    // Create bookMenu instance
    const bookMenuRoot = ensureNotNull(document.getElementById("bookMenu"));
    this.bookMenu = new BookMenu(bookMenuRoot);

    // Create gameLevelMenu instance
    const gameLevelMenuRoot = ensureNotNull(document.getElementById("gameLevelMenu"));
    this.gameLevelMenu = new GameLevelMenu(gameLevelMenuRoot);
    // Set up screen manager additional functions after gameLevelMenu is created
    this.screenManager.additionalFunctions.gameLevelMenu = this.gameLevelMenu.levelMenu;

    // Create editorLevelMenu instance
    this.editorLevelMenu = createEditorLevelMenu();

    // Set up screen manager additional functions (hook bindings)
    this.screenManager.additionalFunctions.editorLevelMenu = this.editorLevelMenu;
    this.screenManager.additionalFunctions.bookMenu = this.bookMenu;
    this.screenManager.additionalFunctions.editor = this.editor;
    this.screenManager.additionalFunctions.game = this.game;
  }

  openEditor(): void {
    this.screenManager.switchTo("bookMenu");
  }

  openPlayerEditor(): void {
    let level = Level.empty(6);
    level.index = 0;
    this.editor.openLevel(level, {
      levels: [level],
      source: "playerEditor",
      id: "playerEditor",
      title: "Player Editor",
    });
    this.screenManager.switchTo("editor");
  }
}

export const appContext = new AppContext();

