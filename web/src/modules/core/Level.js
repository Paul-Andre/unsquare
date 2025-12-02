"use strict";

import { Grid } from './Grid';
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
    level.title = null;
    level.index = -1;
    level.isIcon = false;
    level.isCustom = false;
    level.hidden = false;
    level.mode = "normal";
    level.id = generate_id("level");

    let operations = compute_operations_for_level(level);
    let m = operations.length;

    level.solutions = [new Array(m).fill(0)];
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
    level.title = json.title;
    level.index = json.index;
    level.isIcon = !!json.isIcon;
    level.hidden = !!json.hidden;
    level.mode = json.mode || "normal";
    if (json.id) {
      level.id = json.id;
    } else {
      level.id = generate_id("level");
    }
    let hasValidSolution = false;
    if (json.solutions) {
      // Only include valid solutions from json.solutions
      level.solutions = json.solutions
        .map(sol => sol.slice())
        .filter(sol => level_check_solution(level, sol));
      level.solutionType = json.solutionType;
      hasValidSolution = level.solutions.length > 0;
    } else if (json.solutionVector) {
      // Backward compatibility: convert old solutionVector to solutions array
      level.solutions = [json.solutionVector.slice()];
      level.solutionType = json.solutionType;
      hasValidSolution = level_check_solution(level, level.solutions[0]);
    }
    if (!hasValidSolution) {
      // A lot of code relies on the solution vector being set,
      // so I compute it here, even if it is suboptimal.
      // However if it's not optimal.
      compute_gaussian_solution(level);

      // Sanity check, that the computed solution makes sense
      assert(check_all_solutions(level));

      level.par = null;
    } else {
      if (level.mode == "challenge") {
        level.par = null;
      } else {
        level.par = vector_sum(level.solutions[0]);
      }
    }

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
    level.title = null;
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

      level.solutions = [solution];
      level.solutionType = "submitted";
    } else {
      return null;
    }

    // Sanity check: verify all solutions are valid
    assert(check_all_solutions(level));
    level.par = vector_sum(level.solutions[0]);

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
    if (this.title) {
      json.title = this.title;
    }
    if (this.isIcon) {
      json.isIcon = this.isIcon;
    }
    if (this.hidden) {
      json.hidden = this.hidden;
    }
    if (this.mode && this.mode !== "normal") {
      json.mode = this.mode;
    }
    json.index = this.index;
    json.id = this.id;

    json.solutions = this.solutions.map(sol => sol.slice());
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
    this.title = otherLevel.title;
    // TODO: does it make sense to copy the index?
    this.index = otherLevel.index;
    this.id = otherLevel.id;
    this.isIcon = otherLevel.isIcon;
    this.isCustom = otherLevel.isCustom || false;
    this.hidden = otherLevel.hidden || false;
    this.mode = otherLevel.mode || "normal";
    if (otherLevel.solutions) {
      this.solutions = otherLevel.solutions.map(sol => sol.slice());
    } else {
      this.solutions = [];
    }
    this.solutionType = otherLevel.solutionType;
    if (otherLevel.book !== undefined) {
      this.book = otherLevel.book;
    }
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
    if (!this.solutions || this.solutions.length === 0) {
      return null;
    }
    let par = vector_sum(this.solutions[0]);
    return par;
  }
}

export function check_all_solutions(level) {
  if (!level.solutions || level.solutions.length === 0) {
    return false;
  }
  return level.solutions.every(sol => level_check_solution(level, sol));
}

export function compute_gaussian_solution(level) {
  let sol = get_gaussian_solution_for_level(level);
  if (sol) {
    level.solutions = [sol];
    level.solutionType = "gaussian";
  } else {
    level.solutions = [];
    level.solutionType = "impossible";
  }
}
