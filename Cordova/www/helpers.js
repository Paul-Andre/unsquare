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



var touchable=false;


window.addEventListener("load",function(){
	if ('ontouchstart' in document) {
		document.body.className =
			document.body.className.replace(/\bno-touch\b/,'');
		window.touchable = true;
	}
}, false)




