"use strict";

import { LevelMenuComponent } from './LevelMenuComponent.js';
import Sortable from 'sortablejs';

export const editorLevelMenu = new LevelMenuComponent("editorLevelMenu", true);
console.log("editorLevelMenu", editorLevelMenu);

// Enable drag-and-drop sorting in the editor level menu
if (editorLevelMenu && editorLevelMenu.container) {
  Sortable.create(editorLevelMenu.container, {
    // animation: 150,
    draggable: '.level_icon',
    group: "editor",
    onEnd: function () {
      editorLevelMenu.saveIconOrder();
    }
  });

  // This was supposed to be a temporary swap area.
  Sortable.create(document.querySelector("#editorLevelMenu #iconContainer2"), {
    // animation: 150,
    draggable: '.level_icon',
    group: "editor",
    onEnd: function () {
      editorLevelMenu.saveIconOrder();
    }
  });

}
