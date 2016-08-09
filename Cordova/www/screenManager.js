//** Event Listeners **//
$(window).ready(function() {
  $(".back").click(function() {
          screenManager.goBack();
  });

  $(".toBooks").click(function() {
          screenManager.switchTo("Books");
  });

  $(".toOptions").click(function() {
          screenManager.switchTo("Options");
  });
});

//** Library to switch between screens **//

"use strict";

var screenManager = {
	additionalFunctions: {},
	stack: [],
	currentScreenName: "loading",
	currentScreen: $("#loading"), // This doesn't exist when it is called at this point.
	executeFunction: function(screenName, funcName) {
		if(screenName in this.additionalFunctions
                   && funcName in this.additionalFunctions[screenName]){
			this.additionalFunctions[screenName][funcName]();
		}
	},
	switchTo: function(screenName, keepAsIs) {
                if (this.currentScreen) { this.currentScreen.hide(100) }
                else { $("#" + this.currentScreenName).hide(100) }

		this.stack.push({name: this.currentScreenName, keepAsIs: !!keepAsIs});
		if (!keepAsIs) {
			this.executeFunction(this.currentScreenName, "onHide");
		}

		this.currentScreenName = screenName;
		this.currentScreen = $("#" + screenName);
		this.currentScreen.show(100);
		this.executeFunction(this.currentScreenName, "onShow");
	},
	goBack: function() {
		this.currentScreen.hide(100);
		var popped = this.stack.pop();
		this.executeFunction(this.currentScreenName, "onHide");
		
		this.currentScreenName = popped.name;
		this.currentScreen = $("#" + this.currentScreenName);
		this.currentScreen.show(100);
		if (!popped.keepAsIs) {
			this.executeFunction(this.currentScreenName, "onShow");
		}
	}
}

screenManager.additionalFunctions.loadingScreen = {
	onHide:function(){
		$("#loading").get().remove();
		screenManager.stack.shift(); // This is to remove the loadingScreen from the stack.
		delete screenManager.additionalFunctions.loadingScreen;
	}
}
