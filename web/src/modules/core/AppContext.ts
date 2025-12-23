"use strict";

import { cast, ensureNotNull } from '../utils/helpers.ts';
import { Game } from '../game/Game.ts';
import { Editor } from '../game/Editor.ts';
import { ScreenManager } from '../ui/ScreenManager.ts';
import { BookMenuScreen } from '../ui/BookMenuScreen.ts';
import { MainLevelMenuScreen } from '../ui/MainLevelMenuScreen.tsx';
import { OpeningInstructionsScreen } from '../ui/OpeningInstructionsScreen.ts';
import { Level } from '../core/Level.ts';
import { Book } from '../core/Book.ts';
import { EditorLevelMenuScreen } from '../ui/EditorLevelMenuScreen.ts';
import { ChallengeLevelMenuScreen } from '../ui/ChallengeLevelMenuScreen.ts';
import { GridLevelMenuScreen } from '../ui/GridLevelMenuScreen.ts';
import { AuthModal } from '../ui/AuthModal.ts';

export class AppContext {

  game: Game;
  editor: Editor;
  screenManager: ScreenManager;
  bookMenu: BookMenuScreen;
  gameLevelMenu: MainLevelMenuScreen;
  editorLevelMenu: EditorLevelMenuScreen;
  challengeLevelMenu: ChallengeLevelMenuScreen;
  gridLevelMenu: GridLevelMenuScreen;
  openingInstructions: OpeningInstructionsScreen;
  authModal: AuthModal;

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
    this.bookMenu = new BookMenuScreen(bookMenuRoot);

    const gameLevelMenuRoot = ensureNotNull(document.getElementById("gameLevelMenu"));
    this.gameLevelMenu = new MainLevelMenuScreen(gameLevelMenuRoot);

    const openingInstructionsRoot = ensureNotNull(document.getElementById("opening_instructions"));
    this.openingInstructions = new OpeningInstructionsScreen(openingInstructionsRoot);

    const editorLevelMenuRoot = ensureNotNull(document.getElementById("editorLevelMenu"));
    this.editorLevelMenu = new EditorLevelMenuScreen(editorLevelMenuRoot);

    const challengeLevelMenuRoot = ensureNotNull(document.getElementById("challengeLevelMenu"));
    this.challengeLevelMenu = new ChallengeLevelMenuScreen(challengeLevelMenuRoot);
    const gridLevelMenuRoot = ensureNotNull(document.getElementById("gridLevelMenu"));
    this.gridLevelMenu = new GridLevelMenuScreen(gridLevelMenuRoot);

    const authModalRoot = ensureNotNull(document.getElementById("authModal"));
    this.authModal = new AuthModal(authModalRoot);
    console.log("AuthModal initialized:", this.authModal);

    this.screenManager.additionalFunctions.gameLevelMenu = this.gameLevelMenu;
    this.screenManager.additionalFunctions.editorLevelMenu = this.editorLevelMenu;
    this.screenManager.additionalFunctions.challengeLevelMenu = this.challengeLevelMenu;
    this.screenManager.additionalFunctions.gridLevelMenu = this.gridLevelMenu;
    this.screenManager.additionalFunctions.bookMenu = this.bookMenu;
    this.screenManager.additionalFunctions.editor = this.editor;
    this.screenManager.additionalFunctions.game = this.game;
    this.screenManager.additionalFunctions.opening_instructions = this.openingInstructions;
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

  editorOpenBook(book: Book) {
    this.editorLevelMenu.openBook(book);
    this.screenManager.switchTo("editorLevelMenu");
  }

  goBack() {
    this.screenManager.goBack();
  }
}

export const appContext = new AppContext();

