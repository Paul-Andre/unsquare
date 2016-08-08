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
                if (this.currentScreen) { this.currentScreen.hide() }
                else { $("#" + this.currentScreenName).hide() }

		this.stack.push({name: this.currentScreenName, keepAsIs: !!keepAsIs});
		if (!keepAsIs) {
			this.executeFunction(this.currentScreenName, "onHide");
		}

		this.currentScreenName = screenName;
		this.currentScreen = $("#" + screenName).get();
		this.currentScreen.show();
		this.executeFunction(this.currentScreenName, "onShow");
	},
	goBack: function() {
		this.currentScreen.hide();
		var popped = this.stack.pop();
		this.executeFunction(this.currentScreenName, "onHide");
		
		this.currentScreenName = popped.name;
		this.currentScreen = $("#" + this.currentScreenName).get();
		this.currentScreen.show();
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
