var Books={}

Books.onShow = function() {
	this.showBooks();
}
        
Books.showBooks=function(){

	var container = document.getElementById("bookIconContainer");
	container.innerHTML = "";

	for(var i=0;i<books.length;i++){
		
		var book = books[i];
		var bookButton = document.createElement("div");
		bookButton.innerHTML = "Book "+i;
		bookButton.book = book;
		bookButton.onclick = function(event) {
			Books.openBook(this.book);
		}
		
		/*
		 * TODO
		 * At this point, the icon of the book should be created (drawing on a canvas is cheap)
		 *
		 * The books will be a list of small icons next to the name of the book.
		 */

		container.appendChild(bookButton);
	
	}
}



Books.openBook=function(book){
	console.log(book);
	Levels.loadBook(book);
	screenManager.switchTo("Levels");
};


Books.newBook=function(){
	var book = {levels:[]};
	books.push(book);
	this.showBooks();
};

