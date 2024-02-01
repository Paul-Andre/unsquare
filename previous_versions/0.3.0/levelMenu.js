"use strict";

var levelMenu = {};

levelMenu.openBook = function (book) {
  this.book = book;
};

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



  

levelMenu.createLevelInfo = function (level) {

  let element = htmlStringToElement( `<div class="level_icon">
  <canvas class="level_icon_image levelIcon"> </canvas>
  <div class="level_icon_par"> </div>
  </div>
  `);

  let icon = element.querySelector(".level_icon_image");
  icon.style.width = "55px";
  icon.style.height = "55px";
  icon.width = 55 * window.devicePixelRatio;
  icon.height = 55 * window.devicePixelRatio;
  drawIcon(level, icon);


  icon.className = "levelIcon";

  element.level = level;

  element.onclick = levelMenu.onIconClick;

  let par_display = element.querySelector(".level_icon_par");

  par_display.innerText = vector_sum(level.solutionVector);

  if (IS_EDITOR) {
    if (level.isIcon) {
      icon.classList.add("bookIconRepresentative");
    }
  }


  return element;
  // TODO: add classes based on 
};


let current_level = null;


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

    current_level = this.level;
    if (IS_EDITOR) {
      //editor.setBook(this.book);
      editor.openLevel(this.level);
      screenManager.switchTo("editor");
    } else {


      game.openLevel(this.level);
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


levelMenu.container = document.querySelector("#levelMenu .content");

levelMenu.displayIcons = function () {
  this.container.innerHTML = "";

  for (var i = 0; i < this.book.levels.length; i++) {
    this.container.appendChild(levelMenu.createLevelInfo(this.book.levels[i]));
  }

};

if (IS_EDITOR) {

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

levelMenu.onShow = levelMenu.displayIcons;

screenManager.additionalFunctions.levelMenu = levelMenu;
