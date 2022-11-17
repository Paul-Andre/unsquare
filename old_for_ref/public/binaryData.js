var binaryData=function(){

	
	
	var compatMode=(typeof ArrayBuffer=="undefined")?true:false;//   if(ArrayBuffer)  {var compatMode=false}  else {var compatMode=true}
	
	
	var imageDataContext=document.createElement("canvas").getContext("2d");
	
	
	
	function setCompatMode(v){compatMode=v};
	
	
	
	
	
	
	
	

	function BinaryArray(a,bits,signed){    // a is either an array or the length of the wanted array
		var o=bits?{"signed":!!signed,"bits":bits,"imageData":!signed&&bits==8}:typeof a=="number"?{"signed":false,"bits":8,"imageData":true}: checkArray(a);
		
		
		
		this.length = a.length?a.length:a;
		

		
		
		
		if (compatMode){
			if (o.imageData){
				var data = imageDataContext.createImageData(Math.ceil(this.length/4),1)
				if (data){
					var view = data.data;
				}
				else{
					var useDefault=true;
					var view = [];
				}
				
			}
			else{
				var useDefault=true;
				var view = [];
			}
			
		}
		else{
			var data = new ArrayBuffer(this.length*o.bits/8);
		
			var view = new (viewConstructor(o))(data);
		}
		
		
		
		

		
		                       // I need to declare this.setAll before using it as bellow.
		
		this.setAll=function (v){
			for (var i=0;i<this.length;i++){
				view[i]=v;
			}
		}
		
		
		
		
		if (a.length) for (var i=0;i<this.length;i++){ //set all the values ( but only if  a  has a length)
			view[i]=a[i];
		}
		else useDefault && this.setAll(0); //else if(useDefault) {this.setAll(0);}
		
		
		
		a=undefined; // make the initial array be garbage collected
		
		
		
		
		
		this.get=function(i){
			return view[i];
		}
		
		
		
		
		this.set=function(i,v){
			return view[i]=v;
		}
		
		
		
		this.toArray=function(){
			var a=[];
			for(var i=0;i<this.length;i++){
				a.push(view[i])
			}
			return(a);
		}
		
		
		
		
		
		this.forEach=function(func,x,r){  // func : function to perform on each cell, x : cell on wich to start (optional), r : how many cells to perform the operation on (optional) 
				x=(typeof x=="number")?Math.max(Math.floor(x),0):0;
				for(var end = (typeof r!="number")?this.length:Math.min(Math.ceil(x+r),this.length);x<end;x++){
					func.call(this,view[x],x);
				}
			
		}
		
		
		
		
		this.forEachSet=function(func,x,r){  //forEachSet means that the return value of func() will be the new value of the cell it affected 
				x=(typeof x=="number")?Math.max(Math.floor(x),0):0;
				for(var end = (typeof r!="number")?this.length:Math.min(Math.ceil(x+r),this.length);x<end;x++){
					view[x]=func.call(this,view[x],x);
				}
			
		}
		
		
		
		this.copy=function(x,r){
			x=Math.floor(x);
			r=Math.ceil(r);
			var a=[];
			var end=Math.min(this.length,r+x)
			for(var i=x;i<end;i++){
				a[i-x]=view[i];
			}
			
			return a;
		}
		
		
		this.paste=function(x,a){
			x=Math.floor(x);
			var end=Math.min(this.length,a.length+x);
			for(var i=x;i<end;i++){
				view[i]=a[i-x]
			}
			
		}
		
		
		
		this.testView=function(){
			alert(view);
			console.log(view);
		}
		
		
		
		
	}
           //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	
	
	


	
	
	
	
	function BinaryGrid(a,bits,signed,yyy){ // yyy is used so I can do this: function BinaryGrid(width,height,bits,signed);
		
		
		
		
		if(a.length){ // if a is an array
		
			this.height=a.length;
			this.width=a[0].length;
		
			var a=rearrangeArray(a,this.height,this.width); // turn 2d array in a 1d array

		
			this.length = a.length;
		}
		else{
			
			this.height=bits;
			this.width=a;
			
			this.length=a*bits;
			
			bits=signed;
			signed=yyy;
		}	
			
			
			
			
			
		
			
			
		var o=bits?{"signed":!!signed,"bits":bits,"imageData":!signed&&bits==8}:checkArray(a); //turn "signed" into a boolean by doing !! so if it is undefined, it becomes false; also "imagedata" is true if signed==false and bits==8
		
		
		
		
		
		
		if (compatMode){
			if (o.imageData){
				var data = imageDataContext.createImageData(Math.ceil(this.length/4),1);
				if (data){
					var view = data.data;
				}
				else{
					var useDefault=true;		if (a.length) for (var i=0;i<this.length;i++){ //set all the values ( but only if  a  has a length)
			view[i]=a[i];Array
		}
		else if(useDefault)for (var i=0;i<this.length;i++){ // if we are using a default array, but no array is submitted, we initialise everything to zero
			view[i]=0;
		}
	
					var view = [];
				}
				
			}
			else{
				var useDefault=true;
				var view = [];
			}
			
		}
		else{
			var data = new ArrayBuffer(this.length*o.bits/8);
		
			var view = new (viewConstructor(o))(data);
		}
		
		
		
		
		
		
		
		          // I need to declare this.setAll before using it.
		
		
		this.setAll=function(v){
			for (var i=0;i<this.length;i++){
				view[i]=v;
			}
		}
		
		
		
		
		
		if (a.length) {
			for (var i=0;i<this.length;i++){
				view[i]=a[i];
			}
		}
		else useDefault && this.setAll(0);//else if(useDefault) {this.setAll(0)}
		
		
		
		
		
		a=undefined; // make the initial array be garbage collected 
		
		
		
		
		
		this.get=function(x,y){
			return view[y*this.width+x]
		}
		
		
		
		
		this.set=function(x,y,v){
			return view[y*this.width+x]=v
		}
		
		
		
		
		this.toArray=function(){
			var a=[],aa;
			for(var i=0;i<this.height;i++){
				aa=[];
				for(var j=0;j<this.width;j++){
					aa.push(view[i*this.width+j]);
				}
				a.push(aa);
			}
			return(a);
		}
		
		
		
		
		this.forEach=function(func,tx,ty,w,h){  // func : function to perform on each cell, x,y,w,h : are respectivelly the left, the top, the width, and the height of the rectangle representing the cells on which cells to perform.
				var x=(typeof tx=="number")?Math.max(Math.floor(tx),0):0;
				var y=(typeof ty=="number")?Math.max(Math.floor(ty),0):0;
				
				for(var endX = (typeof w!="number")?this.width:Math.min(Math.ceil(w+tx),this.width),i=x;i<endX;i++)
					for (var endY = (typeof h!="number")?this.height:Math.min(Math.ceil(h+ty),this.height),j=y;j<endY;j++)
					{	
						func.call(this,view[j*this.width+i],i,j);
				}

		}
		 
		

		this.forEachSet=function(func,tx,ty,w,h){  //forEachSet means that the return value of func() will be the new value of the cell it affected 
				var x=(typeof tx=="number")?Math.max(Math.floor(tx),0):0;
				var y=(typeof ty=="number")?Math.max(Math.floor(ty),0):0;
				
				for(var endX = (typeof w!="number")?this.width:Math.min(Math.ceil(tx+w),this.width),i=x;i<endX;i++)
					for (var endY = (typeof h!="number")?this.height:Math.min(Math.ceil(ty+h),this.height),j=y;j<endY;j++)
					{	
						view[j*this.width+i] = func.call(this,view[j*this.width+i],i,j);
				}

		}



		this.setRect=function(tx,ty,w,h,v){  //forEachSet means that the return value of func() will be the new value of the cell it affected 
				var x=(typeof tx=="number")?Math.max(Math.floor(tx),0):0;
				var y=(typeof ty=="number")?Math.max(Math.floor(ty),0):0;
				
				for(var endX = (typeof w!="number")?this.width:Math.min(Math.ceil(tx+w),this.width),i=x;i<endX;i++)
					for (var endY = (typeof h!="number")?this.height:Math.min(Math.ceil(ty+h),this.height),j=y;j<endY;j++)
					{	
						view[j*this.width+i] = v;
				}

		}
		
		
		this.copy=function(x,y,w,h){
			x=Math.floor(x);
			w=Math.ceil(w);
			y=Math.floor(y);
			h=Math.ceil(h);
			var a=[];
			var endX=Math.min(this.width,w+x)
			var endY=Math.min(this.height,h+y)
			for(var i=y;i<endY;i++){
				var aa=[]
				for(var j=x;j<endX;j++){
					aa.push(view[i*this.width+j]);
				}
				a.push(aa);
			}
			return a;	
		}
		
		
		this.paste=function(x,y,a){
			x=Math.floor(x);
			y=Math.floor(y);
			var endX= Math.min(this.width,a[0].length+x);
			var endY= Math.min(this.height,a.length+y);
			for(var i=x;i<endX;i++)for(var j=y;j<endY;j++){
				view[j*this.width+i]=a[j-y][i-x]
			}
			
		}
		
		
		
		this.testView=function(){
			alert(view);
			console.log(view);
		}
		
		
		
		
		
	}
	
	
	
	
	
	
	
	
	
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	
	
	
	
	
	
	
	
	
	//////////////////    helper functions:    //////////////////

	
	
	
	function checkArray(a){
	
		var bits;
		var signed=false;
		var n;
		var mx=0; //max
		var mn=4294967295; //min
		//var float=false;
		for(var i=a.length-1;i>=0;i--){
			n=a[i];
			if( typeof n!="number" ){console.log("error, we only accept numbers. "+n+" is not a number");return n;}
			//if( n!==Math.floor(n)) return console.log("error, we do not yet accept floats");
			mx=Math.max(mx,n);
			mn=Math.min(mn,n);
		}
		if(mn<0)signed=true;
		bits=signed?Math.max(   (mx>2147483647)?console.log("binData: error, no more than 32 bits"):(mx>32767)?32:(mx>127)?16:8,
								(mx<-12147483648)?console.log("binData: error, no more than 32 bits"):(mx<-32768)?32:(mx<-128)?16:8  ) :
								
								(mx>4294967295)?console.log("binData: error, no more than 32 bits"):(mx>65535)?32:(mx>255)?16:8;
								
		
		var o={"signed":signed,"bits":bits,"max":mx,"min":mn,"imageData":!signed&&bits==8};
		return o;

	}
	
	function viewConstructor(o){
		if(o.signed)
		return (o.bits==8)?Int8Array:(o.bits==16)?Int16Array:(o.bits==32)?Int32Array:console.log("binData: error: only 8, 16, and 32 bit accepted");
		return (o.bits==8)?Uint8Array:(o.bits==16)?Uint16Array:(o.bits==32)?Uint32Array:console.log("binData: error: only 8, 16, and 32 bit accepted");
	}
	
	function rearrangeArray(a,h,w){
		var newArray=[];
		for(var i=0;i<h;i++)for(var j=0;j<w; j++){
		newArray.push(Number(a[i][j]));
		}
		return newArray;
		
	}
	

	return {"checkArray":checkArray,"Array":BinaryArray,"Grid":BinaryGrid,"setCompatMode":setCompatMode};
}();
