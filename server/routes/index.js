var express = require('express');
var router = express.Router();
var createError = require('http-errors');
const { createCanvas, loadImage } = require('canvas')


/* GET home page. */
router.get('/', function(req, res, next) {
  console.log(req.query);
  if (req.query.s !== 's') {
    return next(createError.BadRequest());
  }
  var w = parseInt(req.query.w);
  var h = parseInt(req.query.h);
  if (isNaN(w) || isNaN(h) || w<2 || h<2 || w>20 || h>20) {
    return next(createError.BadRequest());
  }
  
  var g = req.query.g;
  if (typeof(g)!=="string" || g.length != (w*h)) {
    return next(createError.BadRequest());
  }

  var good = true;
  for (var i=0; i<g.length; i++) {
    if (! (g[i] == '0' || g[i] == '1')) {
      good = false;
    }
  }
  if (!good) {
    return next(createError.BadRequest());
  }
  
  var a = [];
  for (var j=0; j<h; j++) {
    var aa = [];
    for (var i=0; i<w; i++) {
      aa.push(parseInt(g[i+j*w]));
    }
    a.push(aa);
  }

  var canvas = createCanvas(200, 200);
  var ctx = canvas.getContext("2d")


  for (var j=0; j<h; j++) {
    for (var i=0; i<w; i++) {
      var size = 200/w;
      var sizeWithMargin = size*0.9;
      if (a[j][i]) {
        ctx.fillStyle="black";
      } else {
        ctx.fillStyle="white";
      }
      ctx.fillRect(i*size+(size-sizeWithMargin)*0.5,
        j*size+(size-sizeWithMargin)*0.5, sizeWithMargin, sizeWithMargin);
    }
  }


  var body = canvas.createPNGStream().read(1000000);
  res.writeHead(200, {
    'Content-Length': body.length,
    'Content-Type': 'image/png'
  })
  .end(body);



});

module.exports = router;
