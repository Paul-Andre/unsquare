"use strict";

import { cast, ensureNotNull } from '../utils/helpers.ts';
import { Game } from '../game/Game.ts';
import { Editor } from '../game/Editor.ts';
import { ScreenManager } from '../ui/ScreenManager.ts';
import { BookMenuScreen } from '../ui/BookMenuScreen.ts';
import { MainLevelMenuScreen } from '../ui/MainLevelMenuScreen.tsx';
import { OpeningInstructionsScreen } from '../ui/OpeningInstructionsScreen.ts';
import { Level } from '../core/Level.ts';
import { Book, BookNavigation } from '../core/Book.ts';
import { EditorLevelMenuScreen } from '../ui/EditorLevelMenuScreen.ts';
import { ChallengeLevelMenuScreen } from '../ui/ChallengeLevelMenuScreen.ts';
import { GridLevelMenuScreen } from '../ui/GridLevelMenuScreen.ts';
import { AuthModal } from '../ui/AuthModal.ts';
import { DailyWeeklyArchiveOfferModal } from '../ui/DailyWeeklyArchiveOfferModal.ts';
import { RedirectingToPaymentModal } from '../ui/RedirectingToPaymentModal.ts';
import { weeklyChallengesBookSignal, dailyLevelsBookSignal } from './loadBook.ts';

export class AppContext {

  game: Game;
  editor: Editor;
  screenManager: ScreenManager;
  bookMenu: BookMenuScreen;
  mainLevelMenu: MainLevelMenuScreen;
  editorLevelMenu: EditorLevelMenuScreen;
  challengeLevelMenu: ChallengeLevelMenuScreen;
  gridLevelMenu: GridLevelMenuScreen;
  openingInstructions: OpeningInstructionsScreen;
  authModal: AuthModal;
  dailyWeeklyArchiveOfferModal: DailyWeeklyArchiveOfferModal;
  redirectingToPaymentModal: RedirectingToPaymentModal;

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

    const mainLevelMenuRoot = ensureNotNull(document.getElementById("mainLevelMenu"));
    this.mainLevelMenu = new MainLevelMenuScreen(mainLevelMenuRoot);

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

    const dailyWeeklyArchiveOfferModalRoot = ensureNotNull(document.getElementById("dailyWeeklyArchiveOfferModal"));
    this.dailyWeeklyArchiveOfferModal = new DailyWeeklyArchiveOfferModal(dailyWeeklyArchiveOfferModalRoot);
    console.log("DailyWeeklyArchiveOfferModal initialized:", this.dailyWeeklyArchiveOfferModal);

    const redirectingToPaymentModalRoot = ensureNotNull(document.getElementById("redirectingToPaymentModal"));
    this.redirectingToPaymentModal = new RedirectingToPaymentModal(redirectingToPaymentModalRoot);
    console.log("RedirectingToPaymentModal initialized:", this.redirectingToPaymentModal);

    this.screenManager.additionalFunctions.mainLevelMenu = this.mainLevelMenu;
    this.screenManager.additionalFunctions.editorLevelMenu = this.editorLevelMenu;
    this.screenManager.additionalFunctions.challengeLevelMenu = this.challengeLevelMenu;
    this.screenManager.additionalFunctions.gridLevelMenu = this.gridLevelMenu;
    this.screenManager.additionalFunctions.bookMenu = this.bookMenu;
    this.screenManager.additionalFunctions.editor = this.editor;
    this.screenManager.additionalFunctions.game = this.game;
    this.screenManager.additionalFunctions.opening_instructions = this.openingInstructions;
  }

  goToWeeklyArchive(): void {
    this.challengeLevelMenu.bindBookSignal(weeklyChallengesBookSignal);
    this.challengeLevelMenu.openBook(weeklyChallengesBookSignal.get());
    this.screenManager.switchTo("challengeLevelMenu");
  }

  goToDailyArchive(): void {
    this.gridLevelMenu.bindBookSignal(dailyLevelsBookSignal);
    this.gridLevelMenu.openBook(dailyLevelsBookSignal.get());
    this.screenManager.switchTo("gridLevelMenu");
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

  processBookNavigation(bookNavigation: BookNavigation): void {
    if (bookNavigation.action === "offerDailyWeeklyArchive") {
      this.dailyWeeklyArchiveOfferModal.show(bookNavigation.continuations);
    }
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

