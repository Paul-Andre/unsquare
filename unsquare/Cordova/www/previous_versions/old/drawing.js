var drawCheck = function(ctx,scaleValue,fillStyle,strokeStyle) {

	var scaleValue= scaleValue||1

	var fillStyle=fillStyle||"#000000";
	//alert(scaleValue)
	ctx.save();
	ctx.scale(scaleValue,scaleValue);
	ctx.fillStyle = fillStyle;
	ctx.strokeStyle = strokeStyle;
	ctx.save();
	ctx.miterLimit = 4;
	ctx.translate(0,-612.36218);
	ctx.lineWidth= 5/scaleValue;
	ctx.lineJoin = 'miter';
	ctx.beginPath();
	ctx.moveTo(167.3273,885.21803);
	ctx.bezierCurveTo(159.16171,879.94716,151.91160000000002,873.89342,143.17682000000002,870.21793);
	ctx.bezierCurveTo(126.79273000000002,863.32368,118.98081000000002,859.57284,91.38882700000002,857.50068);
	ctx.bezierCurveTo(108.06124000000003,864.39165,124.85782000000002,874.76337,137.55336000000003,888.18967);
	ctx.bezierCurveTo(152.95037000000002,904.47291,166.85152000000002,932.85447,171.58436000000003,946.17066);
	ctx.bezierCurveTo(183.50779000000003,915.38012,219.66994000000003,850.22807,255.57402000000002,811.29101);
	ctx.bezierCurveTo(286.80625000000003,777.42044,351.22813,731.88174,366.60638,728.9756);
	ctx.bezierCurveTo(348.13786,727.1786099999999,280.34729,770.40481,243.55054,800.30101);
	ctx.bezierCurveTo(214.02953000000002,824.2859100000001,178.77654,867.0177100000001,167.3273,885.21803);
	ctx.closePath();
	ctx.fill();
	ctx.restore();
	//ctx.fillStyle="red"
	ctx.textAlign="center";
	//ctx.
	ctx.font = "italic 25pt Times New Roman, Serif";

	ctx.strokeStyle="white"
	ctx.strokeText("Press to continue",220,390);
	ctx.fillText("Press to continue",220,390);
	ctx.restore();

};


