var tutorial = {returnFunction: null};

tutorial.display=function(returnFunction){
	this.returnFunction=returnFunction;
	this.show();
}

tutorial.return=function(){
	this.hide();
	if (this.returnFunction!=null){
		this.returnFunction();
	}
}
						
tutorial.show=function(){
	document.getElementById("tutorialDiv").style.display="";
}

tutorial.hide=function(){
	document.getElementById("tutorialDiv").style.display="none";
}
