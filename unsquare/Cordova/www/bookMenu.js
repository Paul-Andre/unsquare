"use strict";

let current_book = null;

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
          let data = JSON.parse(request.responseText);
          books[i] = data;
          console.log(data);
        } else {
        }
      };

      request.onerror = function () {};

      request.send();
    }
  }
  return books;
}


let static_books = load_static_books();


let editor_books = [];


function load_editor_books() {
  for (let i=0; i<localStorage.length; i++) {
    let key = localStorage.key(i);
    if (key.startsWith("editor_book")) {
      let value = localStorage.getItem(key);
      console.log(value);
      editor_books.push(JSON.parse(value));
    }
  }
};

function save_editor_book(book) {
  let key = "editor_" + book.id;
  localStorage.setItem(key, JSON.stringify(book));
}

var bookMenu = {};

bookMenu.onShow = function () {
  if (IS_EDITOR) {
    load_editor_books();
    this.books = editor_books;
  } else {
    this.books = static_books;
  }
  this.showBooks();
};

bookMenu.showBooks = function () {
  var container = document.getElementById("bookContainer");

  container.innerHTML = "";
  

  for (var i = 0; i < this.books.length; i++) {
    container.append(bookMenu.prepareBook(this.books[i]));
  }
};

bookMenu.openBook = function (book) {
  levelMenu.openBook(book);
  screenManager.switchTo("levelMenu");
};

bookMenu.newBook = function () {
  console.assert(IS_EDITOR);
  var book = new_book();
  save_editor_book(book);

  this.books.push(book);

  this.showBooks();
};

bookMenu.loadBooks = function () {};

let bookTemplate =
  "<div class='book'> \
  <div class='bookIconContainer'> \
  <img src='asdf.png'>\
  </div>\
  <div class='bookInfoContainer'>\
    <div class='bookName'>\
    </div>\
  </div>\
</div>";
bookMenu.prepareBook = function (book) {
  let node = htmlStringToElement(bookTemplate);
  let bn = node.getElementsByClassName("bookName")[0];
  bn.innerHTML = "asdf";

  node.book = book;
  node.onclick = function () {
    bookMenu.openBook(book);
  };

  return node;
};

screenManager.additionalFunctions.bookMenu = bookMenu;
