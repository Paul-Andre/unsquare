"use strict";

import { Book } from '../core/Book.ts';
import { cast } from '../utils/helpers.ts';
import { LevelMenuComponent } from './LevelMenuComponent.ts';
import Sortable from 'sortablejs';

export class EditorLevelMenu {
  root: HTMLElement;
  levelMenu: LevelMenuComponent;
  constructor(root: HTMLElement) {
    this.root = root;
    this.levelMenu = new LevelMenuComponent(root, true);

    this.setupSortable();
  }

  onShow() {
    this.levelMenu.onShow();
  }

  displayBookJson() {
    this.levelMenu.displayBookJson();
  }

  appendJson() {
    this.levelMenu.appendJson();
  }

  newLevel() {
    this.levelMenu.newLevel();
  }

  setDefaultSize() {
    this.levelMenu.setDefaultSize();
  }

  toggleDelete() {
    this.levelMenu.toggleDelete();
  }

  toggleSelectIcon() {
    this.levelMenu.toggleSelectIcon();
  }

  toggleHidden() {
    this.levelMenu.toggleHidden();
  }

  changeBookTitle() {
    this.levelMenu.changeBookTitle();
  }

  openBook(book: Book) {
    this.levelMenu.openBook(book);
  }

  setupSortable() {
    Sortable.create(this.levelMenu.container, {
      draggable: '.level_icon',
      group: "editor",
      onEnd: () => {
        this.levelMenu.saveIconOrder();
      }
    });
    Sortable.create(cast(this.root.querySelector("#iconContainer2"), HTMLElement), {
      draggable: '.level_icon',
      group: "editor",
      onEnd: () => {
        this.levelMenu.saveIconOrder();
      }
    });
  }
}