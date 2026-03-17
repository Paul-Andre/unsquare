"use strict";

import { cast } from '../utils/helpers.ts';
import { htmlStringToElement } from '../utils/helpers.ts';
import { createLevelIconElement } from './icon.ts';
import { appContext } from '../core/AppContext.ts';
import { Book } from '../core/Book.ts';
import { editorBookRepo, selectBookIconLevel } from '../core/editorBooks';

export class BookMenuScreen {
  books: Book[] = [];
  root: HTMLElement;
  container: HTMLElement;
  constructor(root: HTMLElement) {
    this.root = root;
    this.container = cast(this.root.querySelector("#bookContainer"), HTMLElement);
  }

  onShow() {
    this.books = editorBookRepo.list();

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
    const book = editorBookRepo.createNew();

    this.books.push(book);

    this.showBooks();
  }

  saveAll() {
    for (let i = 0; i < this.books.length; i++) {
      editorBookRepo.save(this.books[i]);
    }
  }

  addFromJson() {
    let saveStr = prompt("Paste JSON");
    if (saveStr) {
      const book = editorBookRepo.importSingleBookFromJson(saveStr);
      console.log(book);

      this.books.push(book);

      this.showBooks();
    }
  }

  copyAllBooksToClipboard() {
    let confirmation = window.confirm("Copy all books to clipboard?");
    if (!confirmation) return;
    const booksJson = editorBookRepo.serializeAll(this.books);
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
        const books = editorBookRepo.overwriteAllFromJson(booksJson);
        this.books = books;
        
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

    let icon_level = selectBookIconLevel(book);
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
      editorBookRepo.save(book);
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
        editorBookRepo.delete(book);
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

const bookTemplate =
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
