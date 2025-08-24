"use strict";

let new_level_format = {
  id: "level_1234123412341234",

  geometry: {
    type: "square",
    width: 4,
    height: 4,
  },
  arithmetic: {
    type: "modular",
    modulus: 2,
  },
  tiles: [0,0,0,0, 0,1,1,0, 0,1,1,0, 0,0,0,0],

  solution: null,  // an array of numbers, indicating the operations performed
  solution_optimal: false, // ideally after running the offline solver

  text: null, // null, a string, or a localization object

  metadata: {
    creator_comment: "I like this level",
    difficulty: 0
  }
}


let new_book_format = {
  id: "book_123412343132413",
  title: // either a string or a localization object
  {
    en: "Black and White 1",
  },
  icon_level: "level_1234123412341234",
  levels: [
    new_level_format
  ]

  // Actually, icon level should probably be a level object?
  // Create two different objects? A book_summary object and an actual book object?
}

// info is information stored regarding the how the player did,
// as opposed to data, which is meant to be immutable while the player is playing,
//I created this/ such as the static data about the levels.
let level_info = {
  best_solution: null,
}


let state = {

  tiles: [],
  // Should I just shove the whole "level" inside here?
  // If I do so, then changing size will be carried on through the undo stack
  //
  //
  // Should I also keep the game/editor state here?
  //
  // Perhaps it might make sense to split the editor and game code.
  //
  // but instead of subclassing maybe I can to different html + some mixins
  
  running_solution: [],
  applications: [],
  operations: [],

}

