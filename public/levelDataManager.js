var dataManager={
loading:0,
finishedLoading:function(){},
};


dataManager.finishedLoading = function() {
	document.getElementById("loadingScreenDiv").remove();
	bookMenu.showBooks();
	bookMenu.show();
}


dataManager.prepareBook=function (book){
	var that=this;
	var load=3;
	function loaded(){
		load--;
		if (load == 0){
			book.loaded=true;
			that.loading--;
			if (that.loading==0){
				
				that.finishedLoading();
			}
		}
	}
	

		book.levels.unshift({index:0});
		
		if(book.icon){
			load++;
			var img= new Image();
			img.src=book.icon;
			img.onload=function(){loaded()}
		
		
		}
		
		var defaultColorType=book.defaultColorType;
		var defaultSizeType= book.defaultSizeType;
	
		var grid=null;

		book.saved=null;
		book.loaded=false;

		//load+=2;
		api.ready(
		function(){
			loadBookStates(book,function(){loaded()});
			loadBookBests (book,function(){loaded()});
		});


			//load++;
			for(var i=1;i<book.levels.length;i++){
		
								var level=book.levels[i]
								level.index=i;
		
								if(level.colorType){}
								else{level.colorType=defaultColorType}
		
								level.color=colors[level.colorType];
		
								if(level.sizeType){}
								else{level.sizeType=defaultSizeType}
		
								level.size=sizes[level.sizeType];
		
		
								//level.state=-2;
		
								var h=level.map.length;
								var w=level.map[0].length;		
		
								if(grid!=null && w==grid.width && h==grid.height){
									grid.paste(0,0,level.map)
								}else{
									grid=new binaryData.Grid(level.map,8,false);
								}
		
			
								var iconMultiplier=level.size.iconMultiplier
			
							level.icon=document.createElement("canvas");
							level.icon.width=level.icon.height=iconMultiplier*11;
	
							var ctx=level.icon.getContext("2d");
		
							grid.forEach(function(v,x,y){
				
								ctx.fillStyle=level.color.cells[v].fill;
			
								ctx.fillRect(x*iconMultiplier,y*iconMultiplier,iconMultiplier,iconMultiplier);
	
							});
		
							level.iconData=level.icon.toDataURL("image/png")
		
							level.book=book;
		
		}
		loaded();
	

	

}



dataManager.prepareAllBooks=function(){
	for(var i=0;i<books.length;i++){
		if(!books[i].loaded){
			this.loading++;
			this.prepareBook(books[i]);
		}
	}
}

dataManager.setState =function setState(level,state){

	level.state=state;
	
	level.book.saved[level.index]=state;
	storage.save( level.book.id, serialize(level.book.saved), function( response ) {
		// response.success is a boolean of whether or not it was successfully stored
	} );
	
	

}

function serialize(a){
	
	var lookup=[]
	lookup[0]="0";
	lookup[1]="1";
	lookup[2]="2";
	lookup[-1]="a";
	lookup[-2]="b";

				
	var s= "";
	
	for(var i=0; i<a.length;i++){
	
		s+=lookup[a[i]];
	
	}
	
	return s;

}

function deserialize(s){
	
	var lookup={"0":0,
				"1":1,
				"2":2,
				"a":-1,
				"b":-2
				}
				
	var a= [];
	
	for(var i=0; i<s.length;i++){
	
		a.push(lookup[s[i]]);
	
	}
	
	return a;

}

dataManager.saveBookBests=function saveBookBests(book){
	
	var s="";
	for (var i=1; i<book.levels.length;i++){
		//alert(i+"  "+book.levels[i].best);
		s+=book.levels[i].best.toString(36);
		if(i<book.levels.length-1){
			s+=" ";
		}
	}
	
	storage.save(book.id+"_best",s,function(){
		
	});

}


function loadBookBests(book,callback){

	storage.load(book.id+"_best",function(response){


		var a;
	
		if(typeof response.data!="undefined" &&response.data!==null){
	
			var b = response.data.split(" ")
			a=[];
			b.forEach(function(value,index,array){
				
				a[index]=parseInt(value,36);
			
			});
		}else{
		
			a=[];
			for(var i=1; i<book.levels.length;i++){
			
				a.push(0);
			
			}
		}
		
		
		a.forEach(function(v,i,a){
		
			if(typeof book.levels[i+1].best==="number"){
			
				if ((book.levels[i+1].best!=0&&book.levels[i+1].best>v) ||book.levels[i+1].best==0){
				
					book.levels[i+1].best=v;
				
				}
			
			}else{
			
				book.levels[i+1].best=v;
			}
		
		});
	
	
		callback&&callback();
		
	});




}

function loadBookStates(book,callback){

		
		storage.load( book.id, function( response ) {

		


												if 	(typeof response.data!="undefined"&& response.data!==null){
	
													book.saved=deserialize(response.data);
		
												}else{
	
													book.saved=book.getStartState();
												}
	
	
												for(var i=1;i<book.levels.length;i++){
	
													book.levels[i].state=book.saved[i]
												}
	
												//levelMenu.loadBook(book);
												//loaded();
	
		} );
		
		callback&&callback();
		
}

dataManager.resetBook=function(book){

	book.saved=book.getStartState();
	
	for(var i=1;i<book.levels.length;i++){
	
		book.levels[i].state=book.saved[i]
		book.levels[i].best =0;
	}
	

	
	this.saveState(book);
	
}

dataManager.saveState=function(book){


	for(var i=1;i<book.levels.length;i++){
	
		book.saved[i]=book.levels[i].state;
	}

	storage.save( book.id, serialize(book.saved), function( response ) {
		// response.success is a boolean of whether or not it was successfully stored
	} );
	
	this.saveBookBests(book);
}











