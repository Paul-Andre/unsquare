import { Signal } from "./Signal";
import { appCache } from "../core/appCache";

export function cachedFetchSignal<D>(initial: D, url: string, lsk?: string): Signal<string | D> {
    if (!lsk) {
        lsk = "cached "+url;
    }

    const signal = new Signal(appCache.getItem(lsk)??initial);
    
    (async function () {
      const response = await fetch(url);
      const text = await response.text();
      appCache.setItem(lsk, text);
      signal.set(text);
    })();

    return signal;
}

