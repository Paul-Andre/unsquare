"use strict";

import { Arithmetic } from "./algo";

export class ColorScheme {
  name: string;e
  cells: { [key: number]: { fill: string } };
  arithmetic: Arithmetic;
  constructor(name: string, cells: { [key: number]: { fill: string; }; }, arithmetic: Arithmetic) {
    this.name = name;
    this.cells = cells;
    this.arithmetic = arithmetic;
  }

  unsquare(e) {
    throw new Error("unsquare method must be implemented by subclass");
  }

  resquare(e) {
    throw new Error("resquare method must be implemented by subclass");
  }
}

export class BWColorScheme extends ColorScheme {
  constructor() {
    super(
      "BW",
      {
        1: { fill: "white" },
        2: { fill: "#333333" },
      },
      {
        type: "modular",
        modulus: 2,
      }
    );
  }

  unsquare(e) {
    return e == 1 ? 2 : e == 2 ? 1 : 0;
  }

  resquare(e) {
    return e == 1 ? 2 : e == 2 ? 1 : 0;
  }
}

export class TriColorScheme extends ColorScheme {
  constructor() {
    super(
      "tri",
      {
        1: { fill: "#F9FAC8" },
        2: { fill: "#0431D4" },
        3: { fill: "#FF0040" },
      },
      {
        type: "modular",
        modulus: 3,
      }
    );
  }

  unsquare(e) {
    return e == 1 ? 3 : e == 3 ? 2 : e == 2 ? 1 : 0;
  }

  resquare(e) {
    return e == 3 ? 1 : e == 2 ? 3 : e == 1 ? 2 : 0;
  }
}

export class RainbowColorScheme extends ColorScheme {
  constructor() {
    super(
      "rainbow",
      {
        1: { fill: "#BE81F7" },
        2: { fill: "#5882FA" },
        3: { fill: "#58FAF4" },
        4: { fill: "#82FA58" },
        5: { fill: "#F4FA58" },
        6: { fill: "#FE9A2E" },
        7: { fill: "#FA5858" },
      },
      {
        type: "modular",
        modulus: 7,
      }
    );
  }

  unsquare(e) {
    e++;
    if (e == 8) {
      e = 1;
    }
    return e;
  }

  resquare(e) {
    e--;
    if (e == 0) {
      e = 7;
    }
    return e;
  }
}

export class Rainbow2ColorScheme extends ColorScheme {
  constructor() {
    super(
      "rainbow2",
      {
        1: { fill: "white" },
        2: { fill: "#BE81F7" },
        3: { fill: "#5882FA" },
        4: { fill: "#58FAF4" },
        5: { fill: "#82FA58" },
        6: { fill: "#F4FA58" },
        7: { fill: "#FE9A2E" },
        8: { fill: "#FA5858" },
      },
      {
        type: "modular",
        modulus: 8,
      }
    );
  }

  unsquare(e) {
    e++;
    if (e == 9) {
      e = 1;
    }
    return e;
  }

  resquare(e) {
    e--;
    if (e == 0) {
      e = 8;
    }
    return e;
  }
}

// Create instances of color schemes
export const colorSchemes = {
  BW: new BWColorScheme(),
  tri: new TriColorScheme(),
  rainbow: new RainbowColorScheme(),
  rainbow2: new Rainbow2ColorScheme(),
};

export let colorSchemeByMod = {
  [2]: colorSchemes.BW,
  [3]: colorSchemes.tri,
};

export let modular_arithmetic_colors_cells = {
  [2]: colorSchemes.BW.cells,
  [3]: colorSchemes.tri.cells,
};

export function get_arithmetic_color(n, arithmetic) {
  if (arithmetic.type == "modular") {
    return modular_arithmetic_colors_cells[arithmetic.modulus][n - 1].fill;
  }
  throw Error(`Not supporting arithmetic ${JSON.stringify(arithmetic)} `);
}
