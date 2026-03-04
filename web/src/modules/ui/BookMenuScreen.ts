"use strict";

import { cast, ensureNotNull, generate_id } from '../utils/helpers.ts';
import { htmlStringToElement } from '../utils/helpers.ts';
import { createLevelIconElement } from './icon.ts';
import { appContext } from '../core/AppContext.ts';
import { book_reviver, book_replacer, create_empty_book, save_editor_book } from '../core/bookUtils.ts';
import book1OldData from '../../data/book1Old.json';
import basicBlackWhiteData from '../../data/basicBlackWhite.json';
import niceLevelsData from '../../data/niceLevels.json';
import { Book } from '../core/Book.ts';
import { Level } from '../core/Level.ts';

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

export class BookMenuScreen {
  books: Book[] = [];
  root: HTMLElement;
  container: HTMLElement;
  constructor(root: HTMLElement) {
    this.root = root;
    this.container = cast(this.root.querySelector("#bookContainer"), HTMLElement);
  }

  onShow() {
    load_editor_books();
    this.books = editor_books;

    // this.books = static_books;
    this.showBooks();
  }

  showBooks() {
    this.container.innerHTML = "";

    for (let i = 0; i < this.books.length; i++) {
      this.container.append(this.prepareBook(this.books[i]));
    }
  }

  openBook(book: Book): void {
    appContext.editorOpenBook(book);
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

  copyAllBooksToClipboard() {
    let confirmation = window.confirm("Copy all books to clipboard?");
    if (!confirmation) return;
    const booksJson = JSON.stringify(this.books, book_replacer);
    navigator.clipboard.writeText(booksJson).then(() => {
      alert("All books copied to clipboard");
    }).catch((err) => {
      console.error("Failed to copy to clipboard:", err);
      alert("Failed to copy to clipboard");
    });
  }

  overwriteAllBooksFromJson() {
    const booksJson = window.prompt("Paste json of all books. This will overwrite and delete all existing books.)");
    if (booksJson) {
      try {
        const books = JSON.parse(booksJson, book_reviver);
        if (!Array.isArray(books)) {
          alert("Invalid JSON: expected an array of books");
          return;
        }
        
        // Clear existing books from localStorage
        for (let i = 0; i < this.books.length; i++) {
          let source = this.books[i].source;
          if (source) {
            localStorage.removeItem(source);
          }
        }
        
        // Save new books
        this.books = books;
        for (let i = 0; i < this.books.length; i++) {
          save_editor_book(this.books[i]);
        }
        
        this.showBooks();
        alert(`Successfully loaded ${books.length} book${books.length !== 1 ? 's' : ''}`);
      } catch (err) {
        console.error("Failed to parse JSON:", err);
        alert("Failed to parse JSON");
      }
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
      bn.innerHTML = `${book.id} (${book.levels.length} level${book.levels.length !== 1 ? 's' : ''})`;
    }

    let icon_level = select_book_icon_level(book);
    if (icon_level) {
      let icon = createLevelIconElement(icon_level);

      let bic = node.getElementsByClassName("bookIconContainer")[0];
      bic.append(icon);
    }

    // Apply collapsed state
    if (book.collapsedInEditor) {
      node.classList.add('collapsed');
    }

    // Hide button
    let hideBtn = node.getElementsByClassName("bookHideBtn")[0] as HTMLElement;
    hideBtn.onclick = (e) => {
      e.stopPropagation();
      book.collapsedInEditor = !book.collapsedInEditor;
      save_editor_book(book);
      node.classList.toggle('collapsed');
    };

    // Delete button
    let deleteBtn = node.getElementsByClassName("bookDeleteBtn")[0] as HTMLElement;
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      const levelCount = book.levels.length;
      let proceed: boolean;
      if (levelCount == 0) {
        proceed = true;
      } else {
        proceed =  window.confirm(
          `Confirm deletion of book "${book.title}" with ${levelCount} level${levelCount !== 1 ? 's' : ''}`
        );
      }
      if (proceed) {
        // Remove from localStorage
        if (book.source) {
          localStorage.removeItem(book.source);
        }
        // Remove from books array
        const index = this.books.indexOf(book);
        if (index > -1) {
          this.books.splice(index, 1);
        }
        // Remove from DOM
        node.remove();
      }
    };

    // node.book = book;
    node.onclick = () => {
      this.openBook(book);
    };

    return node;
  }
}

let bookTemplate =
  "<div class='bookSummary'> \
  <button class='bookHideBtn'>−</button>\
  <button class='bookDeleteBtn'>×</button>\
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
