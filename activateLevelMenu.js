"use strict";


// TODO: move these to a different file
function createLevelIcon(level) {
  return createLevelIconCanvas(level);
}

function createLevelIconCanvas(level) {
  var icon = document.createElement("canvas");
  icon.style.width = "55px";
  icon.style.height = "55px";
  icon.width = 55 * window.devicePixelRatio;
  icon.height = 55 * window.devicePixelRatio;
  drawIcon(level, icon);
  return icon;
}

//TODO: "state" creates a pun. Call this something else.
/*
 * 0 - hidden
 * 1 - locked
 * 2 - unsolved
 * 3 - suboptimal
 * 4 - optimal
  */
function calculateStatesWithParams (book, allowedUnsolved, allowedLocked) {
  let states = [];
  for (let i = 0; i<book.levels.length; i++) {
    let level = book.levels[i];
    let par = level.par;
    let best = level.getBestNumMoves();
    if (best===null) {
      if (allowedUnsolved) {
        states[i] = 2;
        allowedUnsolved-=1;
      } else if (allowedLocked) {
        states[i] = 1;
        allowedLocked-=1;
      } else {
        states[i] = 0;
      }
    } else if (best>par) {
      states[i] = 3;
    } else {
      states[i] = 4;
    }
  }
  return states;
}

function calculateStatesProportional (book) {
  let allowedUnsolved = 3;
  const suboptimalIncrease = 0.2
  const optimalIncrease = 0.5

  let allowedLocked = 50;

  let states = [];
  for (let i = 0; i<book.levels.length; i++) {
    let level = book.levels[i];
    let par = level.par;
    let best = level.getBestNumMoves();
    if (best===null) {
      if (allowedUnsolved>0) {
        states[i] = 2;
        allowedUnsolved-=1;
      } else if (allowedLocked) {
        states[i] = 1;
        allowedLocked-=1;
      } else {
        states[i] = 0;
      }
    } else if (best>par) {
      states[i] = 3;
      allowedUnsolved+=suboptimalIncrease;
    } else {
      states[i] = 4;
      allowedUnsolved+=optimalIncrease;
    }
  }
  return states;
}

function calculateStates (book) {
  if (book.levels.length == 0) {
    return [];
  }
  // There's two modes: the first one just shows the first level, forcing
  if (book.levels[0].getBestNumMoves() === null) {
    return calculateStatesWithParams(book, 1, 50);
  } else {
    return calculateStatesProportional(book);
  }
};


// The term activate in this sense means to take something that is an html element in the static dom, and to turn and put data in it and or attach listeners, etc
// And return an object that represents the "conceptual" object of that.
// TODO: I really need to start using the proper OOP
function activateLevelMenu(elementId, isEditor) {

  var levelMenu = {};

  levelMenu.openBook = function (book) {
    this.book = book;
  };

  // TODO: rename; this creates an html node
  levelMenu.createLevelInfo = function (level, state, glow) {

    let element = htmlStringToElement( `<div class="level_icon">
    <canvas class="level_icon_image"> </canvas>
    <div class="level_icon_par"> </div>
    </div>
    `);

    let icon = element.querySelector(".level_icon_image");
    icon.style.width = "55px";
    icon.style.height = "55px";
    icon.width = 55 * window.devicePixelRatio;
    icon.height = 55 * window.devicePixelRatio;
    drawIcon(level, icon);


    element.level = level;

    if (isEditor || state >= 2) {
      element.onclick = levelMenu.onIconClick;
    }

    if (isEditor) {
      let par_display = element.querySelector(".level_icon_par");
      par_display.innerText = vector_sum(level.solutionVector);

      if (level.isIcon) {
        element.classList.add("bookIconRepresentative");
      }
    } else {
      let stateClass =  {
        "0":"icon_hidden",
        "1":"icon_locked",
        "2":"icon_unsolved",
        "3":"icon_suboptimal",
        "4":"icon_optimal",
      }[state];

      element.classList.add(stateClass);
      if (glow) {
        element.classList.add("icon_glow");
      }

    }

    return element;
    // TODO: add classes based on 
  };


  // this function is to be called on icons using the onclick event
  // so "this" refers to the icon element, not levelMenu
  levelMenu.onIconClick = function () {
    if (levelMenu.deleting) {
      this.remove();
      levelMenu.saveIconOrder();
    } else if (levelMenu.selectingIcon) {
      levelMenu.book.levels.forEach(function (a) {
        a.isIcon = false;
      });
      this.level.isIcon = true;

      levelMenu.toggleSelectIcon();
      levelMenu.displayIcons();
      levelMenu.saveBook();

    } else {
      //let levelObject = Level.fromJsonObject(this.level);

      if (isEditor) {
        //editor.setBook(this.book);

        // TODO: some kind of callback in order to nicely set level data?
        editor.openLevel(this.level, levelMenu.book);
        screenManager.switchTo("editor");
      } else {


        game.openLevel(this.level, levelMenu.book);
        screenManager.switchTo("game");
      }
    }
  };

  levelMenu.reindexLevels = function() {
    for (let i=0; i<this.book.levels.length; i++) {
      let level = this.book.levels[i];
      level.index = i;
    }
  }


  levelMenu.container = document.querySelector("#"+elementId+" .content");

  levelMenu.displayIcons = function () {
    this.container.innerHTML = "";

    let states;
    if (!isEditor) {
      states = calculateStates(this.book);
    }

    for (var i = 0; i < this.book.levels.length; i++) {
      let level = this.book.levels[i];
      let glow = (!isEditor && i==0 && states[i] == 2);
      // check par, and based on it figure out the restriction level.
      this.container.appendChild(levelMenu.createLevelInfo(level, isEditor?2:states[i], glow));
    }

  };

  if (isEditor) {

    levelMenu.saveBook  = function() {
      save_editor_book(this.book);
    }

    levelMenu.sortable = Sortable.create(levelMenu.container, {
      onSort: function () {
        levelMenu.saveIconOrder();
      },
    });

    levelMenu.saveIconOrder = function () {
      levelMenu.book.levels = Array.prototype.map.call(
        levelMenu.container.children,
        function (child) {
          return child.level;
        }
      );
      levelMenu.reindexLevels();
      this.saveBook();
    };

    levelMenu.newLevel = function () {
      var level = Level.empty(6);
      level.book = this.book;
      this.book.levels.push(level);
      this.displayIcons();
      this.reindexLevels();
      this.saveBook();
    };

    levelMenu.displayBookJson = async function () {
      let s = 
        JSON.stringify(this.book, book_replacer);

        await navigator.clipboard.writeText(s);
      alert(
        "Saved to clipboard",
      );
    };

    // TODO: turn it into a single state variable
    levelMenu.deleting = false;
    levelMenu.selectingIcon = false;

    levelMenu.toggleDelete = function () {
      // toggle the deleting state
      levelMenu.deleting = levelMenu.deleting == false;
      levelMenu.container.classList.toggle("deleting");
    };

    levelMenu.toggleSelectIcon = function () {
      // toggle the deleting state
      levelMenu.selectingIcon = levelMenu.selectingIcon == false;
      levelMenu.container.classList.toggle("selectingIcon");
    };

  }

  levelMenu.changeBookTitle = function () {
    let new_title = prompt(
      "Set book title",
      this.book.title,
    );

    if (new_title) {
      this.book.title = new_title;
    }
    save_editor_book(this.book);
  }

  // TODO: put this in "subclass"
  levelMenu.clearAllBests = function() {
    for (let i=0; i<levelMenu.book.levels.length; i++) {
      clearBestNumMoves(levelMenu.book.levels[i]);
    }
    levelMenu.displayIcons();
  }

  levelMenu.onShow = levelMenu.displayIcons;

  return levelMenu;
}

