"use strict";

import { cast, ensureNotNull } from '../utils/helpers.ts';
import { Game } from '../game/Game.ts';
import { Editor } from '../game/Editor.ts';
import { ScreenManager } from '../ui/ScreenManager.ts';
import { BookMenu } from '../ui/BookMenu.ts';
import { GameLevelMenu } from '../ui/GameLevelMenu.ts';
import { LevelMenuComponent } from '../ui/LevelMenuComponent.ts';
import { Level } from '../core/Level.ts';
import { Book } from '../core/Book.ts';
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

    const gameRoot = ensureNotNull(document.getElementById("game"));
    const gameCanvas = cast(gameRoot.querySelector("#gameCanvas"), HTMLCanvasElement);
    this.game = new Game(gameRoot, gameCanvas);

    const editorRoot = ensureNotNull(document.getElementById("editor"));
    const editorCanvas = cast(editorRoot.querySelector("#editorCanvas"), HTMLCanvasElement);
    this.editor = new Editor(editorRoot, editorCanvas);

    const bookMenuRoot = ensureNotNull(document.getElementById("bookMenu"));
    this.bookMenu = new BookMenu(bookMenuRoot);

    const gameLevelMenuRoot = ensureNotNull(document.getElementById("gameLevelMenu"));
    this.gameLevelMenu = new GameLevelMenu(gameLevelMenuRoot);

    this.editorLevelMenu = createEditorLevelMenu();

    this.screenManager.additionalFunctions.gameLevelMenu = this.gameLevelMenu;
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
    this.editLevel(level, {
      levels: [level],
      source: "playerEditor",
      id: "playerEditor",
      title: "Player Editor",
    });
  }

  playLevel(level: Level, book: Book): void {
    this.game.openLevel(level, book);
    this.screenManager.switchTo("game");
  }

  editLevel(level: Level, book: Book): void {
    this.editor.openLevel(level, book);
    this.screenManager.switchTo("editor");
  }
}

export const appContext = new AppContext();

