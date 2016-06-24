// Most of the things contained here were just moved from index.html
// And most of these shouldn't really exist.

function toMenu() {
	game.hide();
	levelMenu.loadBook(levelMenu.book);
	levelMenu.show();

}


function toBookMenu() {
	levelMenu.hide();
	bookMenu.show();
	document.getElementById("aboutDiv").style.display = "none";
	document.getElementById("resetDiv").style.display = "none";

}


function showAbout() {

	bookMenu.hide();
	document.getElementById("aboutDiv").style.display = "";


}


function showReset() {

	bookMenu.hide();
	document.getElementById("resetDiv").style.display = "";

}

//For debugging
function resetGame() {

	dataManager.resetBook(books[0]);
	dataManager.resetBook(books[1]);
	toBookMenu();

}
