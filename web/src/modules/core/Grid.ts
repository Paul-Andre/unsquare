export abstract class Grid<T = any> {
  // Abstract base class - get and set methods should be implemented by subclasses
  abstract get(x: number, y: number): T;

  abstract set(x: number, y: number, v: T): void;

  window(x: number, y: number, w: number, h: number): GridWindow<T> {
    return new GridWindow(this, x, y, w, h);
  }

  static from2dArray<T>(a: T[][]): GridFromArray<T> {
    const h = a.length;
    const w = a[0].length;
    const flat = Array.prototype.concat.apply([], a);
    return new GridFromArray(flat, w, h);
  }

  static usingFlatArray<T>(a: T[], w: number, h: number): GridFromArray<T> {
    return new GridFromArray(a, w, h);
  }

  static empty<T>(w: number, h: number): GridFromArray<T> {
    return new GridFromArray(new Array(w * h), w, h);
  }

  static fill<T>(w: number, h: number, v: T): GridFromArray<T> {
    return new GridFromArray(new Array(w * h).fill(v), w, h);
  }

  static withArrayConstructor = {
    blank<T>(con: new (length: number) => T[], w: number, h: number): GridFromArray<T> {
      return new GridFromArray(new con(w * h), w, h);
    },

    fromArray<T>(con: new (length: number) => T[], array: T[][]): GridFromArray<T> {
      const h = array.length;
      const w = array[0].length;
      const grid = new GridFromArray(new con(w * h), w, h);
      grid.forEach(function (_, x, y) {
        grid.set(x, y, array[y][x]);
      });
      return grid;
    },

    fromFunction<T>(con: new (length: number) => T[], w: number, h: number, f: (x: number, y: number) => T): GridFromArray<T> {
      const grid = new GridFromArray(new con(w * h), w, h);
      grid.forEach(function (_, x, y) {
        grid.set(x, y, f(x, y));
      });
      return grid;
    },
  };
}

type ForEachCallback<T> = (v: T, x: number, y: number, grid: BoundedGrid<T>) => void;
type PredicateCallback<T> = (v: T, x: number, y: number, grid: BoundedGrid<T>) => boolean;
type TransformCallback<T> = (v: T, x: number, y: number, grid: BoundedGrid<T>) => T;
type VirtualCallback<T> = (x: number, y: number, original: BoundedGrid<T>) => T;

export abstract class BoundedGrid<T = any> extends Grid<T> {
  abstract width: number;
  abstract height: number;

  forEach(f: ForEachCallback<T>): void {
    // f(v,x,y,grid)
    for (let i = 0; i < this.width; i++) {
      for (let j = 0; j < this.height; j++) {
        f(this.get(i, j), i, j, this);
      }
    }
  }

  some(f: PredicateCallback<T>): boolean {
    // f(v,x,y,grid) - returns true if any element matches the predicate
    for (let i = 0; i < this.width; i++) {
      for (let j = 0; j < this.height; j++) {
        if (f(this.get(i, j), i, j, this)) {
          return true;
        }
      }
    }
    return false;
  }

  every(f: PredicateCallback<T>): boolean {
    // f(v,x,y,grid) - returns true if all elements match the predicate
    for (let i = 0; i < this.width; i++) {
      for (let j = 0; j < this.height; j++) {
        if (!f(this.get(i, j), i, j, this)) {
          return false;
        }
      }
    }
    return true;
  }

  forEachSet(f: TransformCallback<T>): void {
    // f(v,x,y,grid)
    for (let i = 0; i < this.width; i++) {
      for (let j = 0; j < this.height; j++) {
        this.set(i, j, f(this.get(i, j), i, j, this));
      }
    }
  }

  to2dArray(): T[][] {
    const ret: T[][] = [];
    for (let j = 0; j < this.height; j++) {
      const row: T[] = [];
      ret.push(row);
      for (let i = 0; i < this.width; i++) {
        row.push(this.get(i, j));
      }
    }
    return ret;
  }

  toFlatArray(): T[] {
    const ret: T[] = [];
    for (let j = 0; j < this.height; j++) {
      for (let i = 0; i < this.width; i++) {
        ret.push(this.get(i, j));
      }
    }
    return ret;
  }

  setAll(v: T): void {
    this.forEachSet(function () {
      return v;
    });
  }

  virtual(fn: VirtualCallback<T>): VirtualGrid<T> {
    return new VirtualGrid(this, fn);
  }

  map<U>(fn: (v: T, x: number, y: number) => U): GridFromArray<U> {
    return Grid.withArrayConstructor.fromFunction<U>(Array, this.width, this.height, (x, y) => fn(this.get(x, y), x, y));
  }

  clone(): BoundedGrid<T> {
    return this.map((v) => v);
    // TODO: The following would be more efficient. Need to check that it works correctly:
    // return Grid.usingFlatArray(this.toFlatArray(), this.width, this.height);
    // Anyway I end up overriding this in subclasses.
  }
}

export class GridWindow<T = any> extends BoundedGrid<T> {
  original: Grid<T>;
  width: number;
  height: number;
  x: number;
  y: number;

  constructor(original: Grid<T>, x: number, y: number, w: number, h: number) {
    super();
    this.original = original;
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
  }

  get(x: number, y: number): T {
    return this.original.get(x + this.x, y + this.y);
  }

  set(x: number, y: number, v: T): void {
    this.original.set(x + this.x, y + this.y, v);
  }
}

export class VirtualGrid<T = any> extends Grid<T> {
  original: BoundedGrid<T>;
  virtual: VirtualCallback<T>;

  constructor(original: BoundedGrid<T>, virtual: VirtualCallback<T>) {
    super();
    this.original = original;
    this.virtual = virtual;
  }

  get(x: number, y: number): T {
    if (
      x < 0 ||
      y < 0 ||
      x >= this.original.width ||
      y >= this.original.height
    ) {
      return this.virtual(x, y, this.original);
    } else {
      return this.original.get(x, y);
    }
  }

  set(x: number, y: number, v: T): void {
    if (
      x < 0 ||
      y < 0 ||
      x >= this.original.width ||
      y >= this.original.height
    ) {
      throw new Error("Invalid coordinates for virtual grid");
    } else {
      return this.original.set(x, y, v);
    }
  }
}

export class GridFromArray<T = any> extends BoundedGrid<T> {
  array: T[];
  width: number;
  height: number;

  constructor(a: T[], w: number, h: number) {
    super();
    this.array = a;
    this.width = w;
    this.height = h;
  }

  get(x: number, y: number): T {
    return this.array[this.width * y + x];
  }

  set(x: number, y: number, v: T): T {
    return (this.array[this.width * y + x] = v);
  }

  override clone(): GridFromArray<T> {
    return new GridFromArray(this.array.slice(), this.width, this.height);
  }

  override toFlatArray(): T[] {
    return this.array.slice();
  }
}

