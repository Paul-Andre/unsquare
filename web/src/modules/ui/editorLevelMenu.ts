"use strict";

import { cast, ensureNotNull } from '../utils/helpers.ts';
import { LevelMenuComponent } from './LevelMenuComponent.ts';
import Sortable from 'sortablejs';

// TODO: turn this into a class or at least a factory function

const editorLevelMenuRoot = ensureNotNull(document.getElementById("editorLevelMenu"));
export const editorLevelMenu = new LevelMenuComponent(editorLevelMenuRoot, true);
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
  Sortable.create(cast(editorLevelMenuRoot.querySelector("#iconContainer2"), HTMLElement), {
    // animation: 150,
    draggable: '.level_icon',
    group: "editor",
    onEnd: function () {
      editorLevelMenu.saveIconOrder();
    }
  });

}
