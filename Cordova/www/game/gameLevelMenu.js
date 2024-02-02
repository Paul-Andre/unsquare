"use strict";

var gameLevelMenu = activateLevelMenu("gameLevelMenu", false);
screenManager.additionalFunctions.gameLevelMenu = gameLevelMenu;




let bookUrl = "2023_sept_5.json";

//https://stackoverflow.com/a/35294675
let request = new XMLHttpRequest();
request.open("GET", bookUrl, true);

var levels;



// Some really weird bug made me place this here instead of a different file
// TODO: ????
// https://stackoverflow.com/a/52171480
// function cyrb53(str, seed = 0){
function cyrb53(str, seed){
  let h1 = 0xdeadbeef ^ seed,
    h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};


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

request.onload = function () {
  if (request.status >= 200 && request.status < 400) {
    // Success!


    let data = JSON.parse(request.responseText, book_reviver);


    // let patch_pars = [1,2,2,2,3,4,3,4,3,3,4,3,2,3,4,4,6,5,5,3,3,4,5,5,6,5,13,13,8,6,5,12,9];
    // console.log(patch_pars);
    // for (let i=0; i<patch_pars.length; i++) {
    //   data.levels[i].par = Math.min(data.levels[i].par, patch_pars[i]);
    // }

    // console.log(data)
    // console.log(JSON.stringify(data))


    // alert(data)
    current_book = data;

    gameLevelMenu.openBook(current_book);

  } 
};

request.onerror = function (e) {

};

request.send();


