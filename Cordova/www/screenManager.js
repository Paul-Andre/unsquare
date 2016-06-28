"use strict";

function hideElement(element) {
	element.style.display="none";
}

function showElement(element) {
	element.style.display="";
}

var screenManager = {
	additionalFunctions: {},
	stack: [],
	currentScreenName: "loadingScreen",
	currentScreen: document.getElementById("loadingScreen"), // This doesn't exist when it is called at this point.
	executeFunction: function(screenName, funcName) {
		if(screenName in this.additionalFunctions && funcName in this.additionalFunctions[screenName]){
			this.additionalFunctions[screenName][funcName]();
		}
	},
	switchTo: function(screenName, keepAsIs) {

		hideElement(this.currentScreen!==null?this.currentScreen:document.getElementById(this.currentScreenName));

		this.stack.push({name: this.currentScreenName, keepAsIs: !!keepAsIs});
		if (!keepAsIs) {
			this.executeFunction(this.currentScreenName, "onHide");
		}

		this.currentScreenName = screenName;
		this.currentScreen = document.getElementById(screenName);
		showElement(this.currentScreen);
		this.executeFunction(this.currentScreenName, "onShow");
	},
	goBack: function() {
		hideElement(this.currentScreen);
		var popped = this.stack.pop();
		this.executeFunction(this.currentScreenName, "onHide");
		
		this.currentScreenName = popped.name;
		this.currentScreen = document.getElementById(this.currentScreenName);
		showElement(this.currentScreen);
		if (!popped.keepAsIs) {
			this.executeFunction(this.currentScreenName, "onShow");
		}
	}
}

screenManager.additionalFunctions.loadingScreen = {
	onHide:function(){
		document.getElementById("loadingScreen").remove();
		screenManager.stack.shift(); // This is to remove the loadingScreen from the stack.
		delete screenManager.additionalFunctions.loadingScreen;
	}
}
