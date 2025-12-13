//** Library to switch between screens **//

"use strict";

import { ensureNotNull } from "../utils/helpers";

type AdditionalFunctions = {
  onHide?: () => void;
  onShow?: () => void;
};

export class ScreenManager {
  additionalFunctions: Record<string, AdditionalFunctions>;
  stack: { name: string }[];
  currentScreenName: string;
  currentScreen: HTMLElement;
  constructor() {
    this.additionalFunctions = {};
    this.stack = [];
    this.currentScreenName = "opening_instructions"
    this.currentScreen = ensureNotNull(document.getElementById("opening_instructions"));

    // Initialize loading screen functions
    this.additionalFunctions.loadingScreen = {
      onHide: () => {
        ensureNotNull(document.getElementById("loading")).remove();
        this.stack.shift(); // This is to remove the loadingScreen from the stack.
        delete this.additionalFunctions.loadingScreen;
      },
    };
  }

  /**
   * Executes a function for a specific screen if it exists
   */
  executeFunction(screenName: string, funcName: "onHide" | "onShow"): void {
    if (
      screenName in this.additionalFunctions &&
      funcName in this.additionalFunctions[screenName]
    ) {
      this.additionalFunctions[screenName]?.[funcName]?.();
    }
  }

  /**
   * Switches to a new screen
   * @param {string} screenName - The name of the screen to switch to
   */
  switchTo(screenName: string): void {
    console.log("Switching to", screenName);
    if (this.currentScreen) {
      this.currentScreen.classList.remove("variant_shown");
    } else {
      ensureNotNull(document
        .getElementById(this.currentScreenName)
      ).classList.remove("variant_shown");
    }

    this.stack.push({
      name: this.currentScreenName,
    });

    this.executeFunction(this.currentScreenName, "onHide");

    this.currentScreenName = screenName;
    this.currentScreen = ensureNotNull(document.getElementById(screenName));
    this.currentScreen.classList.add("variant_shown");
    setTimeout(() => {
      this.executeFunction(this.currentScreenName, "onShow");
    }, 0);
  }

  /**
   * Goes back to the previous screen
   */
  goBack() {
    this.currentScreen.classList.remove("variant_shown");
    const popped = this.stack.pop();
    if (!popped) {
      return;
    }
    this.executeFunction(this.currentScreenName, "onHide");

    this.currentScreenName = popped.name;
    this.currentScreen = ensureNotNull(document.getElementById(this.currentScreenName));
    this.currentScreen.classList.add("variant_shown");

    setTimeout(() => {
      this.executeFunction(this.currentScreenName, "onShow");
    }, 0);
  }
}

// Create global instance for backward compatibility
export const screenManager = new ScreenManager();
