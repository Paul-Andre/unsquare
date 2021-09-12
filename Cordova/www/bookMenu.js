var bookMenu = {}

bookMenu.onShow = function() {
  this.showBooks();
}

bookMenu.showBooks = function() {

  var container = $("#bookContainer");
  container.html("");

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

//Creates a DOM element from the book info
/*
  Book Dom structure:
<div class="book">
  <div class="bookIconContainer">
  </div>
  <div class="bookInfoContainer">
    <div class="bookName">
    </div>
    <div class="lockIcon">
    </div>
    <div class="price">
    </div>
  </div>
</div>

*/
bookMenu.prepareBook = function(book) {
  var node = $(document.createElement("div")).attr("class", "book");
  var icon = $(document.createElement("div")).attr("class", "bookIconContainer")
    .html("<img src='" + book.icon + "'>");
  var info = $(document.createElement("div")).attr("class", "bookInfoContainer");
  var name = $(document.createElement("div")).attr("class", "bookName")
    .html(book.name);
  if (book.locked) {
    var lock = $(document.createElement("div")).attr("class", "lockIcon")
      .html("<img src='lockIcon.gif'>");
    var price = $(document.createElement("div")).attr("class", "price");
    if ($.isNumeric(book.price)) {
      price.html("$ " + book.price);
    } else {
      price.html(book.price);
    }

    info.append(lock, price);
  }
  info.append(name);
  node.append(icon, info);

  //onclick event
  node.prop("book", book);
  node.click(function() {
    bookMenu.openBook(book);
  });

  return node;
};

screenManager.additionalFunctions.bookMenu = bookMenu;