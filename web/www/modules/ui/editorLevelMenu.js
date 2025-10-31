"use strict";

import { LevelMenuComponent } from './LevelMenuComponent.js';
import Sortable from './Sortable.js';

export const editorLevelMenu = new LevelMenuComponent("editorLevelMenu", true);
console.log("editorLevelMenu", editorLevelMenu);

// Enable drag-and-drop sorting in the editor level menu
if (editorLevelMenu && editorLevelMenu.container) {
  Sortable.create(editorLevelMenu.container, {
    animation: 150,
    draggable: '.level_icon',
    onEnd: function () {
      editorLevelMenu.saveIconOrder();
    }
  });
}
