var levelMenu={book:null};
levelMenu.loadBook=function(book){

		//To keep track of the statistics
		var totalPar = 0;
		var totalMoves = 0;
		var numCompleted = 0;
		var numPar = 0;
		var numLevels;
	
	
	//if(this.book!=book){
		this.book=book;

		var iconContainer=document.getElementById("iconContainer");

		document.getElementById("bookName").innerText=book.name;		
		
		iconContainer.innerHTML = '';
	
		numLevels = book.levels.length - 1;

		for(var i=1;i<book.levels.length;i++){
			var level=book.levels[i];
			//console.log(level.state);
			var icon=document.createElement("div");
			if(level.state == 0){
				icon.setAttribute("class", "levelIcon open");
			} else if(level.state == 1){
				totalMoves += book.levels[i].best;
				totalPar += book.levels[i].par;
				numCompleted++;

				icon.setAttribute("class", "levelIcon done");
			} else if(level.state == 2){
				totalMoves += book.levels[i].best;
				totalPar += book.levels[i].par;
				numCompleted++;
				numPar++;

				icon.setAttribute("class", "levelIcon par");
			} else if(level.state == -1){
				icon.setAttribute("class", "levelIcon closed");
			} else if(level.state == -2){
				icon.setAttribute("class", "levelIcon hidden");
			}
			icon.style.width="55px";
			icon.style.height="55px";
			if(level.state>=-1){icon.style.backgroundImage="url("+book.levels[i].iconData+")";}
			if(level.state>=0){icon.setAttribute("onclick", "levelMenu.startLevel("+i+")");}
			iconContainer.appendChild(icon);

		}
	//}

		document.getElementById("ExtraMovesIndicator").innerHTML = "Moves over par: " + (totalMoves - totalPar);
		document.getElementById("PercentCompletion").innerHTML = "Completed: " + numCompleted + " / " + numLevels;
		document.getElementById("PercentPar").innerHTML = "Completed with par: " + numPar + " / " + numCompleted;
		//document.getElementById("").innerHTML = "Percent " + ;

}
levelMenu.startLevel=function(n){
	this.hide();
	game.clearScreen();
	game.loadLevel(this.book.levels[n]);
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

