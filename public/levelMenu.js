var levelMenu={book:null};
levelMenu.loadBook=function(book){
	
	
	//if(this.book!=book){
		this.book=book;

		var iconContainer=document.getElementById("iconContainer");

		document.getElementById("bookName").innerText=book.name;		
		
		iconContainer.innerHTML = '';
	

		for(var i=1;i<book.levels.length;i++){
			var level=book.levels[i]
			//console.log(level.state);
			var icon=document.createElement("div");
			if(level.state==0){
			icon.setAttribute("class", "levelIcon open");
			} else if(level.state==1){
			icon.setAttribute("class", "levelIcon done");
			} else if(level.state==2){
			icon.setAttribute("class", "levelIcon par");
			} else if(level.state==-1){
			icon.setAttribute("class", "levelIcon closed");
			} else if(level.state==-2){
			icon.setAttribute("class", "levelIcon hidden");
			}
			icon.style.width=level.size.iconWidth+"px";
			icon.style.height=level.size.iconHeight+"px";
			if(level.state>=-1){icon.style.backgroundImage="url("+book.levels[i].iconData+")";}
			if(level.state>=0){icon.setAttribute("onclick", "levelMenu.startLevel("+i+")");}
			iconContainer.appendChild(icon);

		}
	//}

}
levelMenu.startLevel=function(n){
	this.hide();
	game.clearScreen();
	game.loadLevel(this.book.levels[n],this.book);
	game.show();
}




levelMenu.hide=function(){

	document.getElementById("levelMenuDiv").style.display="none";
	
}

levelMenu.show=function(){

	document.getElementById("levelMenuDiv").style.display="";
	
}

levelMenu.resetBook=function(){
	dataManager.resetBook(this.book);
	this.loadBook(this.book);

}

