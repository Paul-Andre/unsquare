function cancelEvent(e) //used to cancel all default behavior for events. Contains lots of "browser quirk targetting" stuff. I should probably redo this.
{
  //e = e ? e : window.event;
  if (e.stopPropagation)
    e.stopPropagation();
  if (e.preventDefault)
    e.preventDefault();
  e.cancelBubble = true;
  e.cancel = true;
  e.returnValue = false;
  return false;
}

//https://stackoverflow.com/a/35385518
function htmlStringToElement(html) {
    var template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstChild;
}
