/*
 * The point of this file is to load the list of level books, load the free ones and the ones that were purchased.
 * It should also fetch user information as what levels are done and what is the best score for each level and that kind of stuff.
 * It should then switch the screen to the main menu.
 *
 * I decided that drawing the icons was fast enough so that it doesn't need to be done in advance, especially that it may take a lot of memory.
 *
 * If we will go for the levels on a server, this file should fetch them. There should be some mechanism for it to have them cached/saved so that the game works offline.
 *
 */

var books = [];

window.addEventListener("load", function() {
  screenManager.switchTo("Home");
  Books.loadBooks();
}, false);
