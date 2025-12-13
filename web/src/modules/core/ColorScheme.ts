"use strict";

import { Arithmetic } from "./algo";

export abstract class ColorScheme {
  name: string;
  cells: Record<number, { fill: string }>;
  arithmetic: Arithmetic;
  constructor(name: string, cells: Record<number, { fill: string; }>, arithmetic: Arithmetic) {
    this.name = name;
    this.cells = cells;
    this.arithmetic = arithmetic;
  }

  abstract unsquare(e: number): number;

  abstract resquare(e: number): number;
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

  unsquare(e: number): number {
    return e == 1 ? 2 : e == 2 ? 1 : 0;
  }

  resquare(e: number): number {
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

  unsquare(e: number): number {
    return e == 1 ? 3 : e == 3 ? 2 : e == 2 ? 1 : 0;
  }

  resquare(e: number): number {
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

  unsquare(e: number): number {
    e++;
    if (e == 8) {
      e = 1;
    }
    return e;
  }

  resquare(e: number): number {
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

  unsquare(e: number): number {
    e++;
    if (e == 9) {
      e = 1;
    }
    return e;
  }

  resquare(e: number): number {
    e--;
    if (e == 0) {
      e = 8;
    }
    return e;
  }
}

// Create instances of color schemes
export const colorSchemes: Record<string, ColorScheme> = {
  BW: new BWColorScheme(),
  tri: new TriColorScheme(),
  rainbow: new RainbowColorScheme(),
  rainbow2: new Rainbow2ColorScheme(),
};

export const colorSchemeByMod: Record<number, ColorScheme> = {
  [2]: colorSchemes.BW,
  [3]: colorSchemes.tri,
};

export const modular_arithmetic_colors_cells: Record<number, Record<number, { fill: string }>> = {
  [2]: colorSchemes.BW.cells,
  [3]: colorSchemes.tri.cells,
};

export function get_arithmetic_color(n: number, arithmetic: Arithmetic): string {
  if (arithmetic.type == "modular") {
    return modular_arithmetic_colors_cells[arithmetic.modulus][n - 1].fill;
  }
  throw Error(`Not supporting arithmetic ${JSON.stringify(arithmetic)} `);
}
