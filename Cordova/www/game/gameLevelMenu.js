"use strict";

var gameLevelMenu = activateLevelMenu("gameLevelMenu", false);
screenManager.additionalFunctions.gameLevelMenu = gameLevelMenu;




let bookUrl = "2023_sept_5.json";

//https://stackoverflow.com/a/35294675
let request = new XMLHttpRequest();
request.open("GET", bookUrl, true);



// TODO: put these all inside a scope or object or something
// Reminder: "best" in this case means the user's best
function getLskForBestNumMoves(level) {
  return level.getFullIdentifier() + " bestNumMoves";
}
function getBestNumMoves(level) {
  let sol = localStorage.getItem(getLskForBestNumMoves(level));
  if (sol === null) return null;
  return Number(sol);
}
function setBestNumMoves(level, num) {
  localStorage.setItem(getLskForBestNumMoves(level), num);
}
function clearBestNumMoves(level, num) {
  localStorage.removeItem(getLskForBestNumMoves(level));
}

request.onload = function () {
  if (request.status >= 200 && request.status < 400) {
    let data = JSON.parse(request.responseText, book_reviver);

    current_book = data;

    gameLevelMenu.openBook(current_book);

  } 
};

request.onerror = function (e) {};

request.send();


