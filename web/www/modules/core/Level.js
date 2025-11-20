"use strict";

import { Grid } from './Grid.js';
import { colorSchemes, colorSchemeByMod } from './ColorScheme.js';
import { tileShapes } from './tileShapes.js';
import { compute_operations_for_level, compute_operations, vector_multiply_matrix, vector_simplify_arithmetic, level_get_arithmetic, level_check_solution, vector_sum, get_gaussian_solution_for_level, assert, get_level_full_identifier } from './algo.js';
import { generate_id } from '../utils/helpers.js';
import { getBestNumMoves } from '../core/levelUtils.js';

export class Level {
  constructor() {}

  static empty(size) {
    const grid = Grid.empty(size, size);
    grid.setAll(1);
    const level = new Level();
    level.colorScheme = colorSchemes.BW;
    level.tileShape = tileShapes.square;
    level.tiles = grid;
    level.par = 0;
    level.text = "";
    level.index = -1;
    level.isIcon = false;
    level.mode = "normal";
    level.id = generate_id("level");

    let operations = compute_operations_for_level(level);
    let m = operations.length;

    level.solutionVector = new Array(m).fill(0);
    level.solutionType = "confirmed";

    return level;
  }

  static fromJsonObject(json) {
    const level = new Level();
    level.colorScheme = colorSchemes.BW; //colorSchemes[json.colorScheme];
    level.tileShape = tileShapes.square; // tileShapes[json.tileShape];
    level.tiles = level.tileShape.gridFromJsonObject(json.tiles);
    level.par = json.par;
    level.text = json.text || "";
    level.index = json.index;
    level.isIcon = !!json.isIcon;
    level.mode = json.mode || "normal";
    if (json.id) {
      level.id = json.id;
    } else {
      level.id = generate_id("level");
    }
    let hasValidSolution = false;
    if (json.solutionVector) {
      level.solutionVector = json.solutionVector;
      level.solutionType = json.solutionType;

      hasValidSolution = level_check_solution(level);
    }
    if (!hasValidSolution) {
      // A lot of code relies on the solution vector being set,
      // so I compute it here, even if it is suboptimal.
      // However if it's not optimal.
      compute_gaussian_solution(level);
      level.par = null;
    } else {
      level.par = vector_sum(level.solutionVector);
    }
    // Sanity check, that solution makes sense
    assert(level_check_solution(level));

    return level;
  }

  static fromCompact(s) {
    let [geo, arith, tOrV, data] = s.split("$");
    if (!geo.startsWith("s_")) {
      return null;
    }
    let [_1, w, h] = geo.split("_");
    w = Number(w);
    h = Number(h);

    if (!arith.startsWith("m_")) {
      return null;
    }
    let [_2, mod] = arith.split("_");
    mod = Number(mod);

    if (data.startsWith("_")) {
      data = data.slice(1).split("_").map(Number);
    } else {
      data = Array.from(data).map(Number);
    }

    const level = new Level();
    level.colorScheme = colorSchemeByMod[mod];
    level.tileShape = tileShapes.square;
    level.text = "";
    level.index = -1;
    level.isIcon = false;
    level.mode = "normal";
    // TODO: does it make sense to not add any numbers or anything?
    level.id = "custom";

    if (tOrV == "v") {
      let operations = compute_operations({
        type: "square",
        width: w,
        height: h,
      });

      let solution = data;

      let reach = vector_multiply_matrix(solution, operations);
      vector_simplify_arithmetic(reach, level_get_arithmetic(level));

      reach = reach.map(a => a + 1);
      level.tiles = Grid.usingFlatArray(reach, w, h);

      level.solutionVector = solution;
      level.solutionType = "submitted";
    } else {
      return null;
    }

    assert(level_check_solution(level));
    level.par = vector_sum(level.solutionVector);

    return level;
  }

  toJsonObject() {
    const json = {};
    json.colorScheme = this.colorScheme.name;
    json.tileShape = this.tileShape.name;
    json.tiles = this.tiles.to2dArray(); //TODO: should be tileShape.gridToJson...
    json.par = this.par;
    if (this.text) {
      json.text = this.text;
    }
    if (this.isIcon) {
      json.isIcon = this.isIcon;
    }
    if (this.mode && this.mode !== "normal") {
      json.mode = this.mode;
    }
    json.index = this.index;
    json.id = this.id;

    json.solutionVector = this.solutionVector;
    json.solutionType = this.solutionType;

    json.__type__ = "Level";
    return json;
  }

  clone() {
    const level = new Level();
    level.copyFrom(this);
    return level;
  }

  copyFrom(otherLevel) {
    this.colorScheme = otherLevel.colorScheme;
    this.tileShape = otherLevel.tileShape;
    this.tiles = otherLevel.tiles.clone();
    this.par = otherLevel.par;
    this.text = otherLevel.text;
    this.index = otherLevel.index;
    this.id = otherLevel.id;
    this.isIcon = otherLevel.isIcon;
    this.mode = otherLevel.mode || "normal";
    if (otherLevel.solutionVector) {
      this.solutionVector = otherLevel.solutionVector.slice();
    } else {
      this.solutionVector = null;
    }
    this.solutionType = otherLevel.solutionType;
  }

  getFullIdentifier() {
    // Contains the id of the level, as well as information that can be used to recreate the level.
    return get_level_full_identifier(this);
  }

  getBestNumMoves() {
    return getBestNumMoves(this);
  }

  showsDemo() {
    return this.id == "level_1693531796434";
  }

  getPar() {
    let par = vector_sum(this.solutionVector);
    return par;
  }
}

export function compute_gaussian_solution(level) {
  let sol = get_gaussian_solution_for_level(level);
  if (sol) {
    level.solutionVector = sol;
    level.solutionType = "gaussian";
  } else {
    level.solutionVector = null;
    level.solutionType = "impossible";
  }
}
