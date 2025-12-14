"use strict";

import { cast, ensureNotNull } from '../utils/helpers.ts';
import { LevelMenuComponent } from './LevelMenuComponent.ts';
import Sortable from 'sortablejs';

/**
 * Factory function to create and configure the editorLevelMenu instance
 * Sets up drag-and-drop sorting using Sortable
 */
export function createEditorLevelMenu(): LevelMenuComponent {
  const editorLevelMenuRoot = ensureNotNull(document.getElementById("editorLevelMenu"));
  const editorLevelMenu = new LevelMenuComponent(editorLevelMenuRoot, true);
  console.log("editorLevelMenu", editorLevelMenu);

  // Enable drag-and-drop sorting in the editor level menu
  if (editorLevelMenu && editorLevelMenu.container) {
    Sortable.create(editorLevelMenu.container, {
      // animation: 150,
      draggable: '.level_icon',
      group: "editor",
      onEnd: () => {
        editorLevelMenu.saveIconOrder();
      }
    });

    // This was supposed to be a temporary swap area.
    Sortable.create(cast(editorLevelMenuRoot.querySelector("#iconContainer2"), HTMLElement), {
      // animation: 150,
      draggable: '.level_icon',
      group: "editor",
      onEnd: () => {
        editorLevelMenu.saveIconOrder();
      }
    });
  }

  return editorLevelMenu;
}
