"use strict";

class Game2 extends GameBase2 {
  constructor(canvasId, divId) {
    super(canvasId, divId);
  }

  // this specifies what happens when you activate squares
  action(v) {
    return this.level.colorScheme.unsquare(v);
  }

  restart() {
    this.openLevel(this.level, this.book);
    this.draw();
  }

  isFinished() {
    if (this.gameState) {
      var finished = true;
      this.gameState.tiles.forEach(function (v) {
        if (v != 1) {
          finished = false;
        }
      });
      return finished;
    }
    return false;
  }

  finishedLevel() {
    let oldSum = vector_sum(this.level.solutionVector);

    console.log(this.gameState.runningSolution);

    //TODO (not sure if it's an add or a subtract) (but it's the same thing mod 2)
    let newSolution = vector_add(this.level.solutionVector, this.gameState.runningSolution);
    vector_simplify_arithmetic(newSolution, level_get_arithmetic(this.level));
    let newSum = vector_sum(newSolution)

    // TODO: this is some somewhat fragile code that tries to integrate with the editor...
    if (newSum < oldSum) {
      this.level.solutionVector = newSolution;
      this.level.solutionType = "manual";
      save_editor_book(this.book);
    }

    let prevBest = getBestNumMoves(this.level);

    let numMoves = this.gameState.numMoves

    if (prevBest === null || numMoves < prevBest){
      setBestNumMoves(this.level, numMoves);
    } 

    // TODO: make sure this isn't sent excessively for some reason.
    trackLevelEnd(this.level, this.book);

    this.displayLevelGui(this.level);
    this.updateGui();
  }

  getCurrentBest() {
    if (this.level) {
      return getBestNumMoves(this.level);
    }
    return null;
  }

  displayLevelGui(level) {
    // TODO: really ugly hack
    {
      var a = this.div.getElementsByClassName("finishedLevel")[0];
      a.style.display = "none";
    }
    {
      var a = this.div.getElementsByClassName("finishedGame")[0];
      a.style.display = "none";
    }

    document.getElementById("TextShower").innerText = level.text;
    let par = vector_sum(level.solutionVector);
    //if (level.solutionType == "gaussian" || level.solutionType == "mixed")

    if (level.custom) {
      this.div.getElementsByClassName("parContentInclusive")[0].innerText = "creator par: "+par;
    } else {
      this.div.getElementsByClassName("parContentInclusive")[0].innerText = "par: "+par;
    }

    let index = level.index;

    if (level.custom) {
      document.getElementById("LevelIndicator").innerText = "Custom Level";
    } else {
      document.getElementById("LevelIndicator").innerText = "Level " + (1+ index);
    }

    let states = calculateStates(this.book);

    {
      let prevButton = this.div.querySelector("#prevButton");
      let prevIndex = index-1;
      if (prevIndex < 0 || states[prevIndex]<2) {
        prevButton.setAttribute("disabled", "disabled");
      } else {
        prevButton.removeAttribute("disabled");
      }
    }

    {
      let nextButton = this.div.querySelector("#nextButton");
      let nextIndex = index+1;
      if (nextIndex >= states.length || states[nextIndex]<2) {
        nextButton.setAttribute("disabled", "disabled");
      } else {
        nextButton.removeAttribute("disabled");
      }
    }
  }

  undo() {
    this.gameState.undo();
    this.draw();
  }

  nextLevel() {
    let level = this.level;
    let index = level.index;
    let levels = this.book.levels;

    if (index+1 < levels.length) {
      index += 1;
      var nextLevel = levels[index];

      this.openLevel(nextLevel, this.book);
      this.onShow();
    }
  }

  prevLevel() {
    let level = this.level;
    let index = level.index;
    let levels = this.book.levels;

    if (index-1 >= 0) {
      index -= 1;
      var nextLevel = levels[index];

      this.openLevel(nextLevel, this.book);
      this.onShow();
    }
  }
}

window.game = new Game2("gameCanvas", "game");
console.log("Game instance created:", window.game);
console.log("Game instance type:", typeof window.game);
console.log("Game instance methods:", Object.getOwnPropertyNames(window.game));

screenManager.additionalFunctions.game = window.game;


