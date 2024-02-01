function returnSizes(device){

var deviceSizes = {

 desktop:{

	"11":{


		tileSize:40,
	
	
		iconMultiplier:6,
	
		iconWidth:66,
		
		iconHeight:66,
		
		gameWidth:440,
		
		gameHeight:440,
		
	}


},


 mobile:{

	"11":{


		tileSize:28,
	
	
		iconMultiplier:4,
	
		iconWidth:44,
		
		iconHeight:44,
		
		gameWidth:308,
		
		gameHeight:308,
		
	}


},

}

return deviceSizes[device]
}

var sizes=null;

function resize(){

var w=window.innerWidth;
var h=window.innerHeight;
//alert(w+"  "+h);
var canvas=document.getElementById("gameCanvas");	
	
	if(!(w>440&&h>440)){
	
		sizes=returnSizes("mobile");
		
	
	}else{
	
		sizes=returnSizes("desktop");
	
	
	}




}

resize();
