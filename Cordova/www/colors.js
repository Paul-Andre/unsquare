"use strict";

var colors={

	BW: {
		cells:{
			1: {
				fill:"white",
			},
			2:{
				fill:"black",
			},
		},

		unsquare:function(e){
			return(e==1)?2:(e==2)?1:0;
		},

		resquare:function(e){
			return(e==1)?2:(e==2)?1:0;
		},
	},

	tri: {
		cells:{
			1: {
				fill:"#F9FAC8",
			},
			2:{
				fill:"#0431D4",
			},
			3:{
				fill:"#FF0040",
			},
		},

		unsquare:function(e){
			return(e==1)?3:(e==3)?2:(e==2)?1:0;
		},

		resquare:function(e){
			return(e==3)?1:(e==2)?3:(e==1)?2:0;
		},
	},

	"rainbow":{
		cells:{

			1: {
				fill:"#BE81F7",
			},

			2: {
				fill:"#5882FA",
			},

			3: {
				fill:"#58FAF4",
			},

			4: {
				fill:"#82FA58",
			},

			5: {
				fill:"#F4FA58",
			},

			6: {
				fill:"#FE9A2E",
			},

			7: {
				fill:"#FA5858",
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
	},

	"rainbow2":{
		cells:{

			1: {
				fill:"white",
			},

			2: {
				fill:"#BE81F7",
			},

			3: {
				fill:"#5882FA",
			},

			4: {
				fill:"#58FAF4",
			},

			5: {
				fill:"#82FA58",
			},

			6: {
				fill:"#F4FA58",
			},

			7: {
				fill:"#FE9A2E",
			},

			8: {
				fill:"#FA5858",
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
	},
}

