//** Library to switch between screens **//

"use strict";

export class ScreenManager {
  constructor() {
    this.additionalFunctions = {};
    this.stack = [];
    this.currentScreenName = "opening_instructions"
    this.currentScreen = document.getElementById("loading");

    // Initialize loading screen functions
    this.additionalFunctions.loadingScreen = {
      onHide: () => {
        document.getElementById("loading").remove();
        this.stack.shift(); // This is to remove the loadingScreen from the stack.
        delete this.additionalFunctions.loadingScreen;
      },
    };
  }

  /**
   * Executes a function for a specific screen if it exists
   * @param {string} screenName - The name of the screen
   * @param {string} funcName - The name of the function to execute
   */
  executeFunction(screenName, funcName) {
    if (
      screenName in this.additionalFunctions &&
      funcName in this.additionalFunctions[screenName]
    ) {
      this.additionalFunctions[screenName][funcName]();
    }
  }

  /**
   * Switches to a new screen
   * @param {string} screenName - The name of the screen to switch to
   */
  switchTo(screenName) {
    console.log("Switching to", screenName);
    if (this.currentScreen) {
      this.currentScreen.classList.remove("variant_shown");
    } else {
      document
        .getElementById(this.currentScreenName)
        .classList.remove("variant_shown");
    }

    this.stack.push({
      name: this.currentScreenName,
    });

    this.executeFunction(this.currentScreenName, "onHide");

    this.currentScreenName = screenName;
    this.currentScreen = document.getElementById(screenName);
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
    this.executeFunction(this.currentScreenName, "onHide");

    this.currentScreenName = popped.name;
    this.currentScreen = document.getElementById(this.currentScreenName);
    this.currentScreen.classList.add("variant_shown");

    setTimeout(() => {
      this.executeFunction(this.currentScreenName, "onShow");
    }, 0);
  }
}

// Create global instance for backward compatibility
export const screenManager = new ScreenManager();
