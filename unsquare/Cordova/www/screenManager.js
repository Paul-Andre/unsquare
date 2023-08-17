//** Library to switch between screens **//

"use strict";

var screenManager = {
  additionalFunctions: {},
  stack: [],
  currentScreenName: "home",
  currentScreen: document.getElementById("loading"),
  executeFunction: function (screenName, funcName) {
    if (
      screenName in this.additionalFunctions &&
      funcName in this.additionalFunctions[screenName]
    ) {
      this.additionalFunctions[screenName][funcName]();
    }
  },
  switchTo: function (screenName, keepAsIs) {
    if (this.currentScreen) {
      this.currentScreen.classList.remove("variant_shown");
    } else {
      document.getElementById(this.currentScreenName).classList.remove("variant_shown");
    }

    this.stack.push({
      name: this.currentScreenName,
      keepAsIs: !!keepAsIs,
    });
    if (!keepAsIs) {
      this.executeFunction(this.currentScreenName, "onHide");
    }

    this.currentScreenName = screenName;
    this.currentScreen = document.getElementById(screenName);
    this.currentScreen.classList.add("variant_shown");
    this.executeFunction(this.currentScreenName, "onShow");
  },
  goBack: function () {
    this.currentScreen.classList.remove("variant_shown");
    var popped = this.stack.pop();
    this.executeFunction(this.currentScreenName, "onHide");

    this.currentScreenName = popped.name;
    this.currentScreen = document.getElementById(this.currentScreenName);
    this.currentScreen.classList.add("variant_shown");
    if (!popped.keepAsIs) {
      this.executeFunction(this.currentScreenName, "onShow");
    }
  },
};

screenManager.additionalFunctions.loadingScreen = {
  onHide: function () {
    document.getElementById("loading").remove();
    screenManager.stack.shift(); // This is to remove the loadingScreen from the stack.
    delete screenManager.additionalFunctions.loadingScreen;
  },
};
