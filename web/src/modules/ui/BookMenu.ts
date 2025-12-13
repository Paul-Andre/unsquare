"use strict";

import { assert, cast, generate_id } from '../utils/helpers.ts';
import { htmlStringToElement } from '../utils/helpers.ts';
import { createLevelIconElement } from './icon.ts';
import { editorLevelMenu } from './editorLevelMenu.ts';
import { screenManager } from './ScreenManager.ts';
import { book_reviver, create_empty_book, save_editor_book } from '../core/bookUtils.ts';
import book1OldData from '../../data/book1Old.json';
import basicBlackWhiteData from '../../data/basicBlackWhite.json';
import niceLevelsData from '../../data/niceLevels.json';
import { Book } from '../core/Book.ts';
import { Level } from '../core/Level.ts';

export function load_static_books() {
  // Convert imported JSON data using book_reviver
  const books = [
    JSON.parse(JSON.stringify(book1OldData), book_reviver),
    JSON.parse(JSON.stringify(basicBlackWhiteData), book_reviver),
    JSON.parse(JSON.stringify(niceLevelsData), book_reviver),
  ];
  return books;
}

//let static_books = load_static_books();

let editor_books: Book[] = [];

export function load_editor_books() {
  editor_books = [];
  for (let i = 0; i < localStorage.length; i++) {
    let key = localStorage.key(i);
    if (key && key.startsWith("editor_book")) {
      let value = localStorage.getItem(key);
      let book = JSON.parse(value!, book_reviver);
      book.source = key;
      editor_books.push(book);
    }
  }
}

export class BookMenu {
  books: Book[] = [];
  constructor() {
  }

  onShow() {
    load_editor_books();
    this.books = editor_books;

    // this.books = static_books;
    this.showBooks();
  }

  showBooks() {
    let container = document.getElementById("bookContainer");
    assert(container !== null);

    container.innerHTML = "";

    for (let i = 0; i < this.books.length; i++) {
      container.append(this.prepareBook(this.books[i]));
    }
  }

  openBook(book: Book): void {
    editorLevelMenu.openBook(book);
    screenManager.switchTo("editorLevelMenu");
  }

  newBook() {

    let book = create_empty_book();
    save_editor_book(book);

    this.books.push(book);

    this.showBooks();
  }

  saveAll() {
    for (let i = 0; i < this.books.length; i++) {
      save_editor_book(this.books[i]);
    }
  }

  addFromJson() {
    let saveStr = prompt("Paste JSON");
    if (saveStr) {
      let book = JSON.parse(saveStr, book_reviver);
      book.id = generate_id("book");

      console.log(book);
      save_editor_book(book);

      this.books.push(book);

      this.showBooks();
    }
  }

  loadBooks() {}

  prepareBook(book: Book): HTMLElement {
    let node = cast(htmlStringToElement(bookTemplate), HTMLElement);
    {
      let bn = node.getElementsByClassName("bookName")[0];
      bn.innerHTML = book.title;
    }
    {
      let bn = node.getElementsByClassName("bookId")[0];
      bn.innerHTML = book.id;
    }

    let icon_level = select_book_icon_level(book);
    if (icon_level) {
      let icon = createLevelIconElement(icon_level);

      let bic = node.getElementsByClassName("bookIconContainer")[0];
      bic.append(icon);
    }

    // node.book = book;
    node.onclick = () => {
      this.openBook(book);
    };

    return node;
  }
}

let bookTemplate =
  "<div class='bookSummary'> \
  <div class='bookIconContainer'> \
  \
  \
  </div>\
  <div class='bookInfoContainer'>\
  <div>\
    <span class='bookName'>\
    </span>\
    <br/>\
    <span class='bookId'>\
    </span>\
</div>\
  </div>\
</div>";

export function select_book_icon_level(book: Book): Level | null {
  for (let i = 0; i < book.levels.length; i++) {
    let level = book.levels[i];
    if (level.isIcon) {
      return level;
    }
  }
  if (book.levels.length >= 1) {
    return book.levels[0];
  }
  return null;
}

export const bookMenu = new BookMenu();
