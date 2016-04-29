function makeGame(canvasId, divId){var canvas=document.getElementById(canvasId);
var ctx=canvas.getContext("2d");
var size=40;




var mouseStart={x:0,y:0,pressed:false}
var mouseNow={x:0,y:0};

var helperCanvas=document.createElement("canvas")
var helperCtx=helperCanvas.getContext("2d");
helperCanvas.width = canvas.width;
helperCanvas.height= canvas.height;

var game={	grid:null,
				pregrid:null,
				data:null,
				book:null,
				color:null,
				undoList:[],
				finished:false,
				size:null
		};
			
			

game.loadLevel=function(data,book){
	
	var w=window.innerWidth;
var h=window.innerHeight;
	
	this.data=data;
	var w =this.data.map.length;
	var h =this.data.map[0].length;	
	if(this.grid!==null && w==this.grid.width && h==this.grid.height){
		this.grid.paste(0,0,data.map)
		this.preGrid.setAll(0);
	}else{
		this.grid=new binaryData.Grid(data.map,8,false);
		this.preGrid=new binaryData.Grid(this.grid.width,this.grid.height,8,false);	
    }
    
   // if(canvas.width!=this.data.size.gameWidth)canvas.width=this.data.size.gameWidth;
  //  if(canvas.height!=this.data.size.gameHeight)canvas.height=this.data.size.gameHeight;
    
    
    if(typeof data.text=="string"){ 
    	document.getElementById("TextShower").innerHTML=data.text;
    }else{
        document.getElementById("TextShower").innerHTML="&zwnj;";
	}
    
    document.getElementById("LevelIndicater").innerHTML="Level "+data.index;
    
    document.getElementById("ParIndicater").innerHTML="Par: "+data.par;
    
    document.getElementById("MovesIndicater").innerHTML="Moves: "+0;
    
    document.getElementById("BestIndicater").innerHTML="Best: "+((data.best==0)?"-":data.best); 
   // init();
   
      this.color=data.color;

	size=data.size.tileSize;
   
   mouseStart.pressed=false;
   this.disactivateEvents();
   var that=this;
   this.swap(function(){that.init()});
   this.moves=0;
   this.undoList.length=0;

  this.book=data.book
   //console.log(data);
   
   levelStats.open(data);

}

game.swap=function(callback){
	var initialTime=Date.now();
	var that=this;
		helperCtx.drawImage(canvas,0,0);
		canvas.width=this.data.size.gameWidth;
		canvas.height=this.data.size.gameHeight;
	function update(){
		
		var time= Date.now()-initialTime;
		if (time>300){
			game.draw(ctx)
			callback();
			helperCanvas.width=that.data.size.gameWidth;
			helperCanvas.height=that.data.size.gameHeight;
		}else{
		ctx.save();
			ctx.translate(canvas.width*(1-time/300),0)
			ctx.drawImage(helperCanvas,-canvas.width,0);
			game.draw(ctx);
		ctx.restore();
		requestAnimationFrame(update);
		}
	}
	update();



}


game.checkIfClear=function checkIfClear(){
	var clear=true;

	this.grid.forEach(function(v){

		if(v!=1){
	
		clear=false;
	
		}

	});


	(clear)&&this.finishedLevel();



}


game.doMouseDown=function(x,y){};


game.doMouseMove=function(x,y){
	if (mouseStart.pressed){
	
	
		this.requestRedraw(ctx);

		
		this.updatePreGrid(Math.floor(mouseStart.x/size),Math.floor(mouseStart.y/size),Math.floor(x/size),Math.floor(y/size));
		
	}
	
};



game.doMouseUp=function(x,y){

	this.preGrid.setAll(0);
	this.unsquareGrid(Math.floor(mouseStart.x/size),Math.floor(mouseStart.y/size),Math.floor(x/size),Math.floor(y/size));
	
};




game.updatePreGrid=function(x1,y1,x2,y2){

	this.preGrid.setAll(0);
	
	var x=Math.min(x1,x2);
	var y=Math.min(y1,y2);
	var w=Math.max(x1,x2)-x+1;
	var h=Math.max(y1,y2)-y+1;	
	var that=this;
	
	if((w==h&&w>1)){
		this.preGrid.forEachSet(function(value,x,y){
	
			return that.color.unsquare(that.grid.get(x,y));
	
		},x,y,w,h);	
	}
		

}

game.unsquareGrid=function(x1,y1,x2,y2){

	var x=Math.min(x1,x2);
	var y=Math.min(y1,y2);
	var w=Math.min(Math.max(x1,x2)-x+1);
	var h=Math.min(Math.max(y1,y2)-y+1);	
	

	
	if((w==h&&w>1)){
			this.undoList.push({x:x, y:y, data:this.grid.copy(x,y,w,h)})
			this.grid.forEachSet(this.color.unsquare,x,y,w,h);
			this.moves++;
			document.getElementById("MovesIndicater").innerHTML="Moves: "+this.moves;
	}
	this.draw(ctx);
	this.checkIfClear();
}

game.undo=function(){
	if(this.undoList.length>0){
	var undo= this.undoList.pop();
	this.grid.paste(undo.x,undo.y,undo.data)
	this.draw(ctx);
	this.moves--;
	document.getElementById("MovesIndicater").innerHTML="Moves: "+this.moves;
	if(this.finished){
		this.finished=false;
		this.init();
	}
	}
}

game.draw=function(ctx){
	var that=this;
	this.grid.forEach(function(value,x,y){
		
		if (that.color.cells[value]){
		ctx.fillStyle=that.color.cells[value].fill;
		ctx.strokeStyle=that.color.cells[value].stroke;
		ctx.fillRect(x*size,y*size,size,size);
		ctx.strokeRect(x*size,y*size,size,size);		
		}
		
	});	

	
	this.preGrid.forEach(function(value,x,y){

		if (that.color.cells[value]){	
		ctx.fillStyle=that.color.cells[value].fill;
		ctx.strokeStyle=that.color.cells[value].stroke;
		ctx.fillRect(x*size+5,y*size+5,size-10,size-10);
	//	ctx.strokeRect(x*size,y*size,size,size);		
		}
		
		

		/*if(value==1){
		ctx.fillStyle="white";
		ctx.fillRect(x*size+5,y*size+5,size-10,size-10);
		ctx.strokeStyle="black";
		ctx.strokeRect(x*size+5,y*size+5,size-10,size-10);
		}
		if(value==2){
		ctx.fillStyle="black";
		ctx.fillRect(x*size+5,y*size+5,size-10,size-10);
		ctx.strokeStyle="white";
		ctx.strokeRect(x*size+5,y*size+5,size-10,size-10);
		}*/
	
	});	
	
	if(mouseStart.pressed){
		ctx.save()
		ctx.strokeStyle=this.color.mouse[0];
		ctx.strokeRect(mouseStart.x,mouseStart.y,mouseNow.x-mouseStart.x,mouseNow.y-mouseStart.y);
		ctx.strokeStyle=this.color.mouse[1];
		ctx.strokeRect(mouseStart.x-0.5,mouseStart.y-0.5,mouseNow.x-mouseStart.x,mouseNow.y-mouseStart.y);
		ctx.restore();
	}
}


game.drawGrid=function(){
	this.draw(ctx);
}

var requestedRedraw=false;
game.requestRedraw=function (){
	var that=this;
	
	if(!requestedRedraw){
		requestAnimationFrame(function(){that.drawGrid();requestedRedraw=false});
		requestedRedraw=true;
	}

}

game.restart=function restart(){
levelStats.close(this.data);
	game.loadLevel(this.data);
	game.draw(ctx);
}


game.finishedLevel=function(){
	this.finished=true;

	var initialTime=Date.now();
	var clicked=false
	
	if (this.data.best==0 || this.moves<this.data.best){
	
		this.data.best=this.moves;
		dataManager.saveBookBests(this.data.book);
	
	}
	
	var par=false;
	
	if(this.moves<=this.data.par){
	
		nextLevel=this.book.updateState(this.data, 2);
		par=true;
	
	}else  {
	
		nextLevel=this.book.updateState(this.data, 1);
	
	}
	
	
	
	function draw(){
		var time=Date.now()-initialTime;
		if(!clicked){
			if (time>150){
				game.draw(ctx)
				
				drawCheck(ctx,canvas.width/440);
			}
			else{
			game.draw(ctx)
			ctx.save()
			ctx.globalAlpha=time/150
				
				drawCheck(ctx,canvas.width/440);
			ctx.restore();
			requestAnimationFrame(draw);
			}
		}
	}
	
	draw();
	
	var nextLevel;
	

		
	var that=this;
	if ( typeof this.data.index=="number"){
		game.disactivateEvents();
		canvas.onmousedown=canvas.ontouchstart=function(evt){
			game.loadLevel(nextLevel);
			return cancelEvent(evt);
		}
	}
	
	levelStats.pass(this.data);
	
	
}


game.init=function(){

var canvasOffset = { left: 0, top: 0 };
	var element = canvas;
	while( element )
	{
		if( typeof element.offsetLeft !== 'undefined' )
		{
			canvasOffset.left += element.offsetLeft;
			canvasOffset.top += element.offsetTop;
		}		
		element = element.parentNode;
	}	
	
	
	
	


	var that=this;
	
	
	//if (touchable){
	
	//alert("touchable");
	
	canvas.ontouchstart=function doMouseDown(event){
		var x,y;
		if(event.targetTouches){
			x = mouseStart.x =Math.max(0,Math.min(canvas.width-2, event.targetTouches[0].pageX - canvasOffset.left  ));
			y = mouseStart.y =Math.max(0,Math.min(canvas.height-2, event.targetTouches[0].pageY - canvasOffset.top  ));
			//alert("targetTouches: yep")
		}else{alert("something fishy")}
		
		//alert(x+"  "+y);
		mouseStart.pressed=true;
		that.doMouseDown(x,y);
		return cancelEvent(event);
	}

	canvas.ontouchend=function doMouseUp(event){
		var x, y;
		if(event.changedTouches){
			x=Math.max(0,Math.min(canvas.width-2,    event.changedTouches[0].pageX - canvasOffset.left ));
			y =Math.max(0,Math.min(canvas.height-2,    event.changedTouches[0].pageY - canvasOffset.top ));
		}
		mouseStart.pressed=false;
		that.doMouseUp(x,y);
		return cancelEvent(event);
	}

	canvas.ontouchmove=function doMouseMove(event){
		var x, y
		if(event.changedTouches){
			x= mouseNow.x = Math.max(0,Math.min(canvas.width-2,      event.changedTouches[0].pageX - canvasOffset.left   ));;
			y = mouseNow.y= Math.max(0,Math.min(canvas.height-2,      event.changedTouches[0].pageY - canvasOffset.top ));
		}
		that.doMouseMove(x,y);
		//alert("touchmove");
		return cancelEvent(event);
	}
	
	//}else{
	
	
		//alert("not touchable");
		
		
	 canvas.onmousedown=function doMouseDown(event){
		var x,y;
		if(event.offsetX) {
			x = mouseStart.x =Math.max(0,Math.min(canvas.width-2,      event.offsetX));
			y = mouseStart.y =Math.max(0,Math.min(canvas.height-2,    event.offsetY));
			//alert("offsetX: yep")
		}
		else if(event.layerX) {
			x = mouseStart.x = Math.max(0,Math.min(canvas.width-2,event.layerX));
			y = mouseStart.y = Math.max(0,Math.min(canvas.height-2,event.layerY));
			//alert("layerX: yep")
		}
		
		//alert(x+"  "+y);
		mouseStart.pressed=true;
		that.doMouseDown(x,y);
		return cancelEvent(event);
	}

	canvas.onmouseup=function doMouseUp(event){
		var x, y
		if(event.offsetX) {
			x = Math.max(0,Math.min(canvas.width-2,      event.offsetX));
			y = Math.max(0,Math.min(canvas.height-2,    event.offsetY));
		}
		else if(event.layerX) {
			x = Math.max(0,Math.min(canvas.width-2,event.layerX));
			y = Math.max(0,Math.min(canvas.height-2,event.layerY));
		}
		mouseStart.pressed=false;
		that.doMouseUp(x,y);
		return cancelEvent(event);
	}

	canvas.onmousemove=function doMouseMove(event){
		var x, y
		if(event.offsetX) {
			x = mouseNow.x=Math.max(0,Math.min(canvas.width-2,      event.offsetX));
			y = mouseNow.y=Math.max(0,Math.min(canvas.height-2,    event.offsetY));
		}
		else if(event.layerX) {
			x = mouseNow.x=Math.max(0,Math.min(canvas.width-2,event.layerX));
			y = mouseNow.y=Math.max(0,Math.min(canvas.height-2,event.layerY));
		}
		that.doMouseMove(x,y);
		//alert("touchmove");
		return cancelEvent(event);
	}
	
	
	
	
}

game.disactivateEvents=function(){

	canvas.ontouchstart=canvas.onmousedown= null;
	canvas.ontouchend=canvas.onmouseup=null;
	canvas.ontouchmove=canvas.onmousemove=null;
}


game.hide=function(){

	document.getElementById(divId).style.display="none";
	game.disactivateEvents();
	
	adManager.hide();
	
	(game.data)&&(levelStats.close(this.data));
}

game.show=function(){

	document.getElementById(divId).style.display="";
	game.init();
	adManager.show();
	setTimeout(function(){
	adManager.reposition();
	},30);
}

game.clearScreen=function(){
	
	canvas.width=canvas.width;
	helperCanvas.width=helperCanvas.width;
}



return game;
}

var game=makeGame("gameCanvas","gameDiv");
