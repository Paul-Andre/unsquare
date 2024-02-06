"use strict";

var colorSchemes = {
  BW: {
    cells: {
      1: {
        fill: "white",
      },
      2: {
        fill: "#333333",
      },
    },

    unsquare: function (e) {
      return e == 1 ? 2 : e == 2 ? 1 : 0;
    },

    resquare: function (e) {
      return e == 1 ? 2 : e == 2 ? 1 : 0;
    },
    // this is to transition to the new level format.
    arithmetic: {
      type: "modular",
      modulus: 2,
    },
  },

  tri: {
    cells: {
      1: {
        fill: "#F9FAC8",
      },
      2: {
        fill: "#0431D4",
      },
      3: {
        fill: "#FF0040",
      },
    },

    unsquare: function (e) {
      return e == 1 ? 3 : e == 3 ? 2 : e == 2 ? 1 : 0;
    },

    resquare: function (e) {
      return e == 3 ? 1 : e == 2 ? 3 : e == 1 ? 2 : 0;
    },

    arithmetic: {
      type: "modular",
      modulus: 3,
    },
  },

  rainbow: {
    cells: {
      1: {
        fill: "#BE81F7",
      },

      2: {
        fill: "#5882FA",
      },

      3: {
        fill: "#58FAF4",
      },

      4: {
        fill: "#82FA58",
      },

      5: {
        fill: "#F4FA58",
      },

      6: {
        fill: "#FE9A2E",
      },

      7: {
        fill: "#FA5858",
      },
    },

    unsquare: function (e) {
      e++;
      if (e == 8) {
        e = 1;
      }
      return e;
    },

    resquare: function (e) {
      e--;
      if (e == 0) {
        e = 7;
      }
      return e;
    },

    arithmetic: {
      type: "",
      modulus: 7,
    },
  },

  rainbow2: {
    cells: {
      1: {
        fill: "white",
      },

      2: {
        fill: "#BE81F7",
      },

      3: {
        fill: "#5882FA",
      },

      4: {
        fill: "#58FAF4",
      },

      5: {
        fill: "#82FA58",
      },

      6: {
        fill: "#F4FA58",
      },

      7: {
        fill: "#FE9A2E",
      },

      8: {
        fill: "#FA5858",
      },
    },

    unsquare: function (e) {
      e++;
      if (e == 9) {
        e = 1;
      }
      return e;
    },

    resquare: function (e) {
      e--;
      if (e == 0) {
        e = 8;
      }
      return e;
    },
    arithmetic: {
      type: "modular",
      modulus: 8,
    },
  },
};

// Automatically make it so that colorScheme.name is the key used to find the
// colorScheme in the colorSchemes object.
for (var colorSchemeName in colorSchemes) {
  colorSchemes[colorSchemeName].name = colorSchemeName;
}

let colorSchemeByMod = {
  [2]: colorSchemes.BW,
  [3]: colorSchemes.tri,
}


let modular_arithmetic_colors_cells = {
  [2]: colorSchemes.BW.cells,
  [3]: colorSchemes.tri.cells
}

function get_arithmetic_color(n, arithmetic) {
  if (arithmetic.type == "modular") {
    return modular_arithmetic_colors_cells[arithmetic.modulus][n-1].fill;
  }
  throw Error(`Not supporting arithmetic ${JSON.stringify(arithmetic)} `);
}

