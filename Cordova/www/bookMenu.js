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

bookMenu.openBook=function(n){
	this.hide();
	levelMenu.loadBook(books[n]);
	levelMenu.show();
};


//alert(window.devicePixelRatio);

