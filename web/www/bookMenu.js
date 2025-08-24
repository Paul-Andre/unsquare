"use strict";


function load_static_books() {
  let books = [];

  let bookUrls = [
    "book1Old.json",
    "basicBlackWhite.json",
    "niceLevels.json",
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


function load_editor_books() {
  editor_books = [];
  for (let i=0; i<localStorage.length; i++) {
    let key = localStorage.key(i);
    if (key.startsWith("editor_book")) {
      let value = localStorage.getItem(key);
      // console.log(value);
      let book = JSON.parse(value, book_reviver);
      book.source = key;
      editor_books.push(book);
    }
  }
};



// For use with JSON.stringify
function book_replacer(key, value) {
  if (value instanceof Level) {
    return value.toJsonObject();
  }
  return value;
}

// For use with JSON.parse
function book_reviver(key, value) {
  if ( typeof value === "object" && value !== null) {
    if (value.__type__ == "Level") {
      return Level.fromJsonObject(value);
    }
    if (value.tileShape == "square") {
      return Level.fromJsonObject(value);
    }
    if (value.tiles) {
      return Level.fromJsonObject(value);
    }
    if (value.levels) {
      for (var i=0; i<value.levels.length; i++) {
        value.levels[i].index = i;
      }
    }
  }
  return value;
}

function save_editor_book(book) {
  let key = "editor_" + book.id;
  localStorage.setItem(key, JSON.stringify(book, book_replacer));
}

function create_empty_book() {
  let book = {
    id: generate_id("book"),
    title: "New Book",
    levels: [],
  };
  return book;
}

class BookMenu {
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
    console.assert(IS_EDITOR);
    var book = create_empty_book();
    save_editor_book(book);

    this.books.push(book);

    this.showBooks();
  }

  saveAll() {
      for (let i=0; i<this.books.length; i++) {
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

function select_book_icon_level(book) {
  for (let i=0; i<book.levels.length; i++) {
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

const bookMenu = new BookMenu();

screenManager.additionalFunctions.bookMenu = bookMenu;
