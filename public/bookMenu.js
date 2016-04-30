var bookMenu={books:books}
        
bookMenu.showBooks=function(){

	var container = document.getElementById("bookIconContainer");

	for(var i=0;i<books.length;i++){
		
		var book = books[i];
		var icon = document.createElement("div");
		
		icon.setAttribute("class","bookIcon");
		icon.setAttribute("onclick","bookMenu.openBook("+i+");");
		icon.style.backgroundImage="url("+book.icon+")";
		//icon.innerText=book.name;
		container.appendChild(icon);
	
	}
	
}

bookMenu.hide=function(){

	document.getElementById("bookMenuDiv").style.display="none";

}

bookMenu.show=function(){

	document.getElementById("bookMenuDiv").style.display="";
	
	

}

bookMenu.displayTutorial=function(){
	
}

bookMenu.openBook=function(n){
	this.hide();
	levelMenu.loadBook(books[n]);
	levelMenu.show();
};

bookMenu.displayTutorial=function(){
	this.hide();
	var that = this;
	// display the tutorial, such that the user returns to the menu when back is hit
	tutorial.display(function(){
		that.show();
	});
}

