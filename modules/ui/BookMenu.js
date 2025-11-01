"use strict";

import { generate_id } from '../utils/helpers.js';
import { htmlStringToElement } from '../utils/helpers.js';
import { createLevelIcon } from './icon.js';
import { editorLevelMenu } from './editorLevelMenu.js';
import { screenManager } from './ScreenManager.js';
import { book_reviver, create_empty_book, save_editor_book } from '../core/bookUtils.js';

export function load_static_books() {
  let books = [];

  let bookUrls = [
    "data/book1Old.json",
    "data/basicBlackWhite.json",
    "data/niceLevels.json",
  ];

  {
    for (let i = 0; i < bookUrls.length; i++) {
      let bookUrl = bookUrls[i];

      //https://stackoverflow.com/a/35294675
      let request = new XMLHttpRequest();
      request.open("GET", bookUrl, true);

      books.push({ name: "loading" }); //placeholder

      request.onload = function () {
        if (request.status >= 200 && request.status < 400) {
          // Success!
          let data = JSON.parse(request.responseText, book_reviver);
          books[i] = data;
        } else {
        }
      };

      request.onerror = function () {};

      request.send();
    }
  }
  return books;
}

//let static_books = load_static_books();

let editor_books = [];

export function load_editor_books() {
  editor_books = [];
  for (let i = 0; i < localStorage.length; i++) {
    let key = localStorage.key(i);
    if (key.startsWith("editor_book")) {
      let value = localStorage.getItem(key);
      // console.log(value);
      let book = JSON.parse(value, book_reviver);
      book.source = key;
      editor_books.push(book);
    }
  }
}

export class BookMenu {
  constructor() {
    this.books = [];
  }

  onShow() {
    load_editor_books();
    this.books = editor_books;

    // this.books = static_books;
    this.showBooks();
  }

  showBooks() {
    var container = document.getElementById("bookContainer");

    container.innerHTML = "";

    for (var i = 0; i < this.books.length; i++) {
      container.append(this.prepareBook(this.books[i]));
    }
  }

  openBook(book) {
    editorLevelMenu.openBook(book);
    screenManager.switchTo("editorLevelMenu");
  }

  newBook() {

    var book = create_empty_book();
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
    var saveStr = prompt("Paste JSON");
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

  prepareBook(book) {
    let node = htmlStringToElement(bookTemplate);
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
      let icon = createLevelIcon(icon_level);

      let bic = node.getElementsByClassName("bookIconContainer")[0];
      bic.append(icon);
    }

    node.book = book;
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

export function select_book_icon_level(book) {
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
