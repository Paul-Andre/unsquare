function Grid(){}
//abstract function get(x,y);
//abstract function set(x,y,v);

function BoundedGrid(){}
BoundedGrid.prototype=Object.create(Grid.prototype);
//int w;
//int h;

BoundedGrid.prototype.forEach=function(f){
//f(v,x,y,grid)
	for(var i=0; i<this.w; i++){
		for(var j=0; j<this.h; j++){
			f(this.get(i,j),i,j,this);
		}
	}
}

BoundedGrid.prototype.forEachSet=function(f){
//f(v,x,y,grid)
	for(var i=0; i<this.w; i++){
		for(var j=0; j<this.h; j++){
			this.set(i,j,f(this.get(i,j),i,j,this));
		}
	}
}


function GridWindow(original,x,y,w,h){
	this.original=original;
	this.x=x;
	this.y=y;
	this.w=w;
	this.h=h;
}

GridWindow.prototype=Object.create(BoundedGrid.prototype);

GridWindow.prototype.get=function(x,y){
	return this.original.get(x+this.x,y+this.y);
}

GridWindow.prototype.set=function(x,y,v){
	return this.original.set(x+this.x,y+this.y,v);
}

	
Grid.prototype.window=function(x,y,w,h){
	return new GridWindow(this,x,y,w,h);
}


//Either cells of the original grid, otherwise access `virtual`
function VirtualGrid(original,virtual){
	this.original=original;
	this.virtual=virtual;
}

VirtualGrid.prototype=Object.create(Grid.prototype);

VirtualGrid.prototype.get=function(x,y){
	if (x<0 || y<0 || x>=this.original.w || y>=this.original.h){
		return this.virtual(x,y,this.original);
	}
	else{
		return this.original.get(x,y)
	}
}

BoundedGrid.prototype.virtual=function(fn){
	return new VirtualGrid(this,fn);
}

function GridFromArray(a,w,h){
	this.array=a;
	this.w=w;
	this.h=h;
}

GridFromArray.prototype=Object.create(BoundedGrid.prototype);

GridFromArray.prototype.get=function(x,y){
	return this.array[this.w*y+x];
}

GridFromArray.prototype.set=function(x,y,v){
	return (this.array[this.w*y+x]=v);
}

Grid.from2dArray = function(a){
	var h = a.length;
	var w = a[0].length;
	var flat = Array.prototype.concat.apply([],a);
	return new GridFromArray(flat,w,h);
}


Grid.usingFlatArray=function(a,w,h){
	return new GridFromArray(a,w,h);
}

Grid.withArrayConstructor={
	blank: function(con,w,h){
		return new GridFromArray(new con(w*h),w,h);
	},
	fromArray: function(con,array){
		var h = array.length;
		var w = array[0].length;
		var grid = new GridFromArray(new con(w*h),w,h);
		grid.forEach(function(_,x,y){
			grid.set(x,y,array[y][x]);
		});
		return grid;
	},
	fromFunction: function(con,w,h,f){
		var grid = new GridFromArray(new con(w*h),w,h);
		grid.forEach(function(_,x,y){
			grid.set(x,y,f(x,y));
		});
		return grid;
	}
}
