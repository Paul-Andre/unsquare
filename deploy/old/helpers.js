function cancelEvent(e)   //used to cancel all default behavior for events. Contains lots of "browser quirk targetting" stuff. I should probably redo this.
{
  //e = e ? e : window.event;
  if(e.stopPropagation)
    e.stopPropagation();
  if(e.preventDefault)
    e.preventDefault();
  e.cancelBubble = true;
  e.cancel = true;
  e.returnValue = false;
  return false;
}


// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
 
// requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
 
// MIT license
 
(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] 
                                   || window[vendors[x]+'CancelRequestAnimationFrame'];
    }
 
    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); }, 
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
 
    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}());



var touchable=false;


	window.addEventListener("load",function(){
if ('ontouchstart' in document) {
    document.body.className =
    document.body.className.replace(/\bno-touch\b/,'');
    window.touchable = true;
}
},false)





/*
// disable :hover on touch devices
// based on https://gist.github.com/4404503 
// via https://twitter.com/javan/status/284873379062890496
// + https://twitter.com/pennig/status/285790598642946048
// re http://retrogamecrunch.com/tmp/hover
//if ('createTouch' in document)
//{
	window.addEventListener("load",function(){
   // try
   // {
        var ignore = /:hover/;
        for (var i=0; i<document.styleSheets.length; i++)
        {
            var sheet = document.styleSheets[i];
            for (var j=sheet.cssRules.length-1; j>=0; j--)
            {
                var rule = sheet.cssRules[j];
                if (rule.type === CSSRule.STYLE_RULE && ignore.test(rule.selectorText))
                {
                    sheet.deleteRule(j);
                }
            }
        }
   // }
  //  catch(e){alert("error");console.log(e);}
  //  alert("and we continue");
    
    },false);
//}
*/
