let books = [];

let bookUrls = [
  "book1Old.json",
  "basicBlackWhite.json",
  "niceLevels.json",
  "supaDupa.json",
];

// This sorta loads anything anytime...
{

  for (let i = 0; i < bookUrls.length; i++) {
    let bookUrl = bookUrls[i];

    //https://stackoverflow.com/a/35294675
    let request = new XMLHttpRequest();
    request.open('GET', bookUrl, true);

    books.push({name: "loading"}); //placeholder

    request.onload = function() {
      if (request.status >= 200 && request.status < 400) {
        // Success!
        let data = JSON.parse(request.responseText);
        books[i] = data;
      } else {

      }
    };

    request.onerror = function() {

    };

    request.send(); 
  }
}

var bookMenu = {}

bookMenu.onShow = function() {
  this.showBooks();
}

bookMenu.showBooks = function() {

  var container = document.getElementById("bookContainer");

  container.innerHTML = ("");

  for (var i = 0; i < books.length; i++) {
    container.append(bookMenu.prepareBook(books[i]));
  }
}


bookMenu.openBook = function(book) {
  levelMenu.openBook(book);
  screenManager.switchTo("levelMenu");
};


bookMenu.newBook = function() {
  var book = {
    levels: []
  };
  books.push(book);
  this.showBooks();
};

bookMenu.loadBooks = function() {

};

let bookTemplate = 
"<div class='book'> \
  <div class='bookIconContainer'> \
  <img src='asdf.png'>\
  </div>\
  <div class='bookInfoContainer'>\
    <div class='bookName'>\
    </div>\
  </div>\
</div>"
;

bookMenu.prepareBook = function(book) {

  let node = htmlStringToElement(bookTemplate);
  let bn = node.getElementsByClassName("bookName")[0]
  bn.innerHTML = "asdf";
  
  node.book = book;
  node.onclick = function() {
    bookMenu.openBook(book);
  };

  return node;
};

screenManager.additionalFunctions.bookMenu = bookMenu;
