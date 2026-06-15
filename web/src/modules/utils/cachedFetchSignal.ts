import { Signal } from "./Signal";
import { cache } from "../core/cache";

export function cachedFetchSignal<D>(initial: D, url: string, lsk?: string): Signal<string | D> {
    if (!lsk) {
        lsk = "cached "+url;
    }

    const signal = new Signal(cache.getItem(lsk)??initial);
    
    (async function () {
      const response = await fetch(url);
      const text = await response.text();
      cache.setItem(lsk, text);
      signal.set(text);
    })();

    return signal;
}

