/*
 * This file is written using modern ES6 classes with inheritance.
 */

class Grid {
  // Abstract base class - get and set methods should be implemented by subclasses
  get(x, y) {
    throw new Error("get method must be implemented by subclass");
  }

  set(x, y, v) {
    throw new Error("set method must be implemented by subclass");
  }

  window(x, y, w, h) {
    return new GridWindow(this, x, y, w, h);
  }

  static from2dArray(a) {
    const h = a.length;
    const w = a[0].length;
    const flat = Array.prototype.concat.apply([], a);
    return new GridFromArray(flat, w, h);
  }

  static usingFlatArray(a, w, h) {
    return new GridFromArray(a, w, h);
  }

  static empty(w, h) {
    return new GridFromArray(new Array(w * h), w, h);
  }

  static withArrayConstructor = {
    blank(con, w, h) {
      return new GridFromArray(new con(w * h), w, h);
    },

    fromArray(con, array) {
      const h = array.length;
      const w = array[0].length;
      const grid = new GridFromArray(new con(w * h), w, h);
      grid.forEach(function (_, x, y) {
        grid.set(x, y, array[y][x]);
      });
      return grid;
    },

    fromFunction(con, w, h, f) {
      const grid = new GridFromArray(new con(w * h), w, h);
      grid.forEach(function (_, x, y) {
        grid.set(x, y, f(x, y));
      });
      return grid;
    },
  };
}

class BoundedGrid extends Grid {
  forEach(f) {
    // f(v,x,y,grid)
    for (let i = 0; i < this.width; i++) {
      for (let j = 0; j < this.height; j++) {
        f(this.get(i, j), i, j, this);
      }
    }
  }

  forEachSet(f) {
    // f(v,x,y,grid)
    for (let i = 0; i < this.width; i++) {
      for (let j = 0; j < this.height; j++) {
        this.set(i, j, f(this.get(i, j), i, j, this));
      }
    }
  }

  to2dArray() {
    const ret = [];
    for (let j = 0; j < this.height; j++) {
      const row = [];
      ret.push(row);
      for (let i = 0; i < this.width; i++) {
        row.push(this.get(i, j));
      }
    }
    return ret;
  }

  setAll(v) {
    this.forEachSet(function () {
      return v;
    });
  }

  virtual(fn) {
    return new VirtualGrid(this, fn);
  }
}

class GridWindow extends BoundedGrid {
  constructor(original, x, y, w, h) {
    super();
    this.original = original;
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
  }

  get(x, y) {
    return this.original.get(x + this.x, y + this.y);
  }

  set(x, y, v) {
    return this.original.set(x + this.x, y + this.y, v);
  }
}

class VirtualGrid extends Grid {
  constructor(original, virtual) {
    super();
    this.original = original;
    this.virtual = virtual;
  }

  get(x, y) {
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
}

class GridFromArray extends BoundedGrid {
  constructor(a, w, h) {
    super();
    this.array = a;
    this.width = w;
    this.height = h;
  }

  get(x, y) {
    return this.array[this.width * y + x];
  }

  set(x, y, v) {
    return (this.array[this.width * y + x] = v);
  }

  clone() {
    return new GridFromArray(this.array.slice(), this.width, this.height);
  }
}
