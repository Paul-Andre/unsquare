"use strict";

import { cast, ensureNotNull } from '../utils/helpers.ts';
import { appContext } from '../core/AppContext.ts';
import { submitParticipantName } from 'modules/core/contests.ts';

export class NamePickingScreen {
  root: HTMLElement;
  inputField: HTMLInputElement;
  enterBtn: HTMLButtonElement;

  constructor(root: HTMLElement) {
    this.root = root;
    this.inputField = cast(root.querySelector('#nameInput'), HTMLInputElement);
    this.enterBtn = cast(root.querySelector('#nameEnterBtn'), HTMLButtonElement);

    this.enterBtn.addEventListener('click', () => this.onEnterClick());
    this.inputField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.onEnterClick();
      }
    });
  }

  onShow(): void {
    this.inputField.focus();
    // this.inputField.value = '';
  }

  private async onEnterClick(): Promise<void> {
    const playerName = this.inputField.value.trim();
    console.log("Player entered name:", playerName);
    
    if (playerName.length > 0) {
      await submitParticipantName(playerName);
      
      // Proceed to opening instructions
      appContext.screenManager.switchTo('opening_instructions');
    }
  }
}
