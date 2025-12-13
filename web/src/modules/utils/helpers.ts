export function cancelEvent(e: Event): boolean {
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
export function htmlStringToElement(html: string): ChildNode {
  let template = document.createElement("template");
  html = html.trim(); // Never return a text node of whitespace as the result
  template.innerHTML = html;
  let firstChild = template.content.firstChild;
  assert(firstChild !== null);
  return firstChild;
}

// https://stackoverflow.com/a/52171480
// function cyrb53(str, seed = 0){
export function cyrb53(str: string, seed: number): number {
  let h1 = 0xdeadbeef ^ seed,
    h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }

  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

function largeNumber(): number {
  // very suspect... see if something else can be done
  return Math.floor(Math.random()*Number.MAX_SAFE_INTEGER);
}

export function generate_id(prefix = "id"): string {
  return prefix + "_" + largeNumber();
}

export function assert(a: boolean): asserts a {
  if (!a) {
    throw new Error("Assertion failed");
  }
}

export function cast<T>(value: unknown, constructor: new (...args: any[]) => T): T {
  if (!(value instanceof constructor)) {
    throw new Error(`Expected instance of ${constructor.name}, got ${value?.constructor?.name || typeof value}`);
  }
  return value;
}

export function ensureNotNull<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error("Value cannot be null or undefined");
  }
  return value;
}