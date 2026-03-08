import { Signal } from "./Signal";

export function cachedFetchSignal<D>(initial: D, url: string, lsk?: string): Signal<string | D> {
    if (!lsk) {
        lsk = "cached "+url;
    }

    const signal = new Signal(localStorage.getItem(lsk)??initial);
    
    (async function () {
      const response = await fetch(url);
      const text = await response.text();
      localStorage.setItem(lsk, text);
      signal.set(text);
    })();

    return signal;
}

