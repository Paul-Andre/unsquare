//** Library to switch between screens **//

"use strict";

var screenManager = {
  additionalFunctions: {},
  stack: [],
  currentScreenName: "loading",
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
      this.currentScreen.style.display = "none";
      //this.currentScreen.hide()
    } else {
      document.getElementById(this.currentScreenName).style.display = "none";
      //$("#" + this.currentScreenName).hide()
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
    //this.currentScreen = $("#" + screenName);
    this.currentScreen.style.display = "block";
    //this.currentScreen.show();
    this.executeFunction(this.currentScreenName, "onShow");
  },
  goBack: function () {
    this.currentScreen.style.display = "none";
    //this.currentScreen.hide();
    var popped = this.stack.pop();
    this.executeFunction(this.currentScreenName, "onHide");

    this.currentScreenName = popped.name;
    this.currentScreen = document.getElementById(this.currentScreenName);
    //this.currentScreen = $("#" + this.currentScreenName);
    this.currentScreen.style.display = "block";
    //this.currentScreen.show();
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
