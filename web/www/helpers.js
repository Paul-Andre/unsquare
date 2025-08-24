class Helpers {
  /**
   * Cancels all default behavior for events. Contains lots of "browser quirk targeting" stuff.
   * @param {Event} e - The event to cancel
   * @returns {boolean} Always returns false
   */
  static cancelEvent(e) {
    if (e.stopPropagation) e.stopPropagation();
    if (e.preventDefault) e.preventDefault();
    // e.cancelBubble = true;
    // e.cancel = true;
    // e.returnValue = false;
    return false;
  }

  /**
   * Converts an HTML string to a DOM element
   * @param {string} html - The HTML string to convert
   * @returns {Element} The first child element from the HTML
   */
  static htmlStringToElement(html) {
    const template = document.createElement("template");
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstChild;
  }

  /**
   * Generates a hash from a string using the cyrb53 algorithm
   * @param {string} str - The string to hash
   * @param {number} seed - The seed value for the hash
   * @returns {number} The hash value
   */
  static cyrb53(str, seed) {
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
  }
}

// Expose methods globally for backward compatibility
function cancelEvent(e) {
  return Helpers.cancelEvent(e);
}

function htmlStringToElement(html) {
  return Helpers.htmlStringToElement(html);
}

function cyrb53(str, seed) {
  return Helpers.cyrb53(str, seed);
}
