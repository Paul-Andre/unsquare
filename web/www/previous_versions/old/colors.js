var colors={

"2":{
			cells:{
			1: {
			
				fill:"white",
				stroke:"black"
		
			},
		
			2:{
			
				fill:"black",
				stroke:"white"
		
			},

		},
		
		unsquare:function(e){
		
			return(e==1)?2:(e==2)?1:0;
		
		},
		
		resquare:function(e){
		
			return(e==1)?2:(e==2)?1:0;
		
		},
		
		mouse:["white","black"],

	},
	
"3":{
			cells:{
			1: {
			
				fill:"#F9FAC8",
				stroke:"#08485A"
		
			},
		
			2:{
			
				fill:"#0431D4",
				stroke:"#D4DA58"
		
			},
			
			3:{
			
				fill:"#FF0040",
				stroke:"#F3F7C1"
		
			},

		},
		
		unsquare:function(e){
		
			return(e==1)?3:(e==3)?2:(e==2)?1:0;
		
		},
		
		resquare:function(e){
		
			return(e==3)?1:(e==2)?3:(e==1)?2:0;
		
		},
		
		mouse:["#F4FA58","#08088A"],

	},
	
"rainbow":{
			cells:{
			
			1: {
			
				fill:"#BE81F7",
				stroke:"#c0c0cc"
		
			},
			
			2: {
			
				fill:"#5882FA",
				stroke:"#c0c0cc"
		
			},
			
			3: {
			
				fill:"#58FAF4",
				stroke:"#c0c0cc"
		
			},
			
			4: {
			
				fill:"#82FA58",
				stroke:"#c0c0cc"
		
			},
			
			5: {
			
				fill:"#F4FA58",
				stroke:"#c0c0cc"
		
			},
			
			6: {
			
				fill:"#FE9A2E",
				stroke:"#c0c0cc"
		
			},
			
			7: {
			
				fill:"#FA5858",
				stroke:"#c0c0cc"
		
			},
		


		},
		
		unsquare:function(e){
			
			e++;
			if(e==8){e=1};
			return e;
		
		},
		
		resquare:function(e){
		
			e--;
			if(e==0){e=7};
			return e;
		
		},
		
		mouse:["#c0c0c0","#303030"],

	},

"rainbow2":{
			cells:{
			
			1: {
			
				fill:"white",
				stroke:"#dddddd"
		
			},
			
			2: {
			
				fill:"#BE81F7",
				stroke:"#c0c0cc"
		
			},
			
			3: {
			
				fill:"#5882FA",
				stroke:"#c0c0cc"
		
			},
			
			4: {
			
				fill:"#58FAF4",
				stroke:"#c0c0cc"
		
			},
			
			5: {
			
				fill:"#82FA58",
				stroke:"#c0c0cc"
		
			},
			
			6: {
			
				fill:"#F4FA58",
				stroke:"#c0c0cc"
		
			},
			
			7: {
			
				fill:"#FE9A2E",
				stroke:"#c0c0cc"
		
			},
			
			8: {
			
				fill:"#FA5858",
				stroke:"#c0c0cc"
		
			},
		


		},
		
		unsquare:function(e){
			
			e++;
			if(e==9){e=1};
			return e;
		
		},
		
		resquare:function(e){
		
			e--;
			if(e==0){e=8};
			return e;
		
		},
		
		mouse:["#c0c0c0","#303030"],

	},


}
