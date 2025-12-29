import { sign } from "crypto";

type Listener<T> = (value: T) => void;
type DiffCheck<T> = (a:T, b:T) => boolean;
function basicStrictNotEqual(a: any, b: any) {
    return a!==b;
}

export class Signal<T> {
    value: T;
    listeners: Listener<T>[] = [];
    diffCheck: DiffCheck<T>
    constructor(v:T, diffCheck: DiffCheck<T>=basicStrictNotEqual) {
        this.value = v;
        this.diffCheck = diffCheck;
    }
    on(f: Listener<T>): void {
        this.listeners.push(f);
    }
    set(v:T): void {
        let prev = this.value;
        this.value = v;
        if (this.diffCheck(prev, v)) {
            console.log("Different", prev, v);
            for (let f of this.listeners) {
                f(v);
            }
        }

    }
    get(): T {
        return this.value;
    }
}

export function get<A,B>(a: Signal<A> | B): A|B {
    if (a instanceof Signal) {
      return a.get();
    }
    return a;
  }

// An "slot" for signals that enforces a "single producer (signal)" and a "single consumer (listener)"
export class SingleSignalConsumer<T> {
    signal: Signal<T> | null = null;
    listener: Listener<T>;
    _innerListener: Listener<T>;
    constructor(listener: Listener<T>) {
        this.listener = listener;
        this._innerListener = (v: T) => {this.listener(v)}
    }
    
    bind(signal: Signal<T>) {
        if (this.signal) {
            this.signal.listeners = this.signal.listeners.filter(f => f != this._innerListener);
        }
        this.signal = signal;
        this.signal.on(this._innerListener);
    }
    get(): T|undefined {
        return this.signal?.get();
    }
}