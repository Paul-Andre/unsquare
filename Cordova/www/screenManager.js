//** Event Listeners **//
$(window).ready(function() {
  $(".back").click(function() {
          screenManager.goBack();
  });

  $(".toOptions").click(function() {
          screenManager.switchTo("options");
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
                if (this.currentScreen) { 
			this.currentScreen.removeClass().addClass("hiddenLeft"); 
		}
                else { $("#" + this.currentScreenName).removeClass().addClass("hiddenLeft"); }

		this.stack.push({name: this.currentScreenName, keepAsIs: !!keepAsIs});
		if (!keepAsIs) {
			this.executeFunction(this.currentScreenName, "onHide");
		}

		this.currentScreenName = screenName;
		this.currentScreen = $("#" + screenName);
		this.currentScreen.removeClass().addClass("showLeft");
		setTimeout(function(){
			this.currentScreen.removeClass().addClass("show");
			this.executeFunction(this.currentScreenName, "onShow");
		}, 501);
	},
	goBack: function() {
		this.currentScreen.removeClass().addClass("hiddenRight");
		var popped = this.stack.pop();
		this.executeFunction(this.currentScreenName, "onHide");
		
		this.currentScreenName = popped.name;
		this.currentScreen = $("#" + this.currentScreenName);
		this.currentScreen.removeClass().addClass("showRight");
		setTimeout(function(){
		this.currentScreen.removeClass().addClass("show");
			if (!popped.keepAsIs) {
				this.executeFunction(this.currentScreenName, "onShow");
			}
		}, 501);
		this.currentScreen.removeClass().addClass("show");
	}
}

screenManager.additionalFunctions.loadingScreen = {
	onHide:function(){
		$("#loading").get().remove();
		screenManager.stack.shift(); // This is to remove the loadingScreen from the stack.
		delete screenManager.additionalFunctions.loadingScreen;
	}
}
