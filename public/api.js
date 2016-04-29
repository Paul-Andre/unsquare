


var api=(function(){

var onReady=[]

var api={}

api.ready=function(fn){
	//onReady.push(fn);
	fn();

}

function finished(){
	for(var i=0; i<onReady.length;i++){
	
		onReady[i]();

	}

}


return api;


})();






var storage=(function(){
	var storage={

	}

	storage.load=function(id,callback){

		callback({data:undefined});

	}

	storage.save=function(id,data,callback){

		callback&&callback({data:undefined});
	
	}

	return storage;
	
})();






/////////////////////////////////////////////////////////////////////////////////

var adManager=(function(){






var adManager={};



adManager.show=function(){


}

adManager.hide=function(){


}

adManager.reposition=function(){

var box=document.getElementById("mobileGameAd");
if(box!==null){





var adPosition= {
        left: 0,
        top:0,
        parent:box,
    };

//console.log(adPosition);
advertisement.setPosition( adPosition );

}

}


window.onresize=function(){

adManager.reposition();
}

return adManager;
})();
