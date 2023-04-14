function cancelEvent(e) {
  //used to cancel all default behavior for events. Contains lots of "browser quirk targetting" stuff. I should probably redo this.
  //e = e ? e : window.event;
  if (e.stopPropagation) e.stopPropagation();
  if (e.preventDefault) e.preventDefault();
  // e.cancelBubble = true;
  // e.cancel = true;
  // e.returnValue = false;
  return false;
}

//https://stackoverflow.com/a/35385518
function htmlStringToElement(html) {
  var template = document.createElement("template");
  html = html.trim(); // Never return a text node of whitespace as the result
  template.innerHTML = html;
  return template.content.firstChild;
}

// https://stackoverflow.com/a/52171480
// function cyrb53(str, seed = 0){
function cyrb53(str, seed){
  let h1 = 0xdeadbeef ^ seed,
    h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};
