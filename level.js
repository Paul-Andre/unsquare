"use strict";

function Level() {}


Level.empty = function makeLevel(size) {
  var grid = Grid.empty(size, size);
  grid.setAll(1);
  var level = new Level();
  level.colorScheme = colorSchemes.BW;
  level.tileShape = tileShapes.square;
  level.tiles = grid;
  level.par = 0;
  level.text = "";
  level.index = -1;
  level.isIcon = false;
  level.id = generate_id("level");

  let operations = compute_operations_for_level(level);
  let m = operations.length;
  
  level.solutionVector = new Array(m).fill(0);
  level.solutionType = "confirmed";

  return level;
};

function compute_gaussian_solution(level) {
  let sol = get_gaussian_solution_for_level(level);
  if (sol) {
    level.solutionVector = sol;
    level.solutionType = "gaussian";
  } else {
    level.solutionVector = null;
    level.solutionType = "impossible";
  }
  if (vector_sum(level.solutionVector) <= 3) {
    level.solutionType = "confirmed";
  }
}

// TODO: do some kind of schema versioning thing, to include future complicated geometry
Level.fromJsonObject = function (json) {
  var level = new Level();
  level.colorScheme = colorSchemes.BW; //colorSchemes[json.colorScheme];
  level.tileShape = tileShapes.square; // tileShapes[json.tileShape];
  level.tiles = level.tileShape.gridFromJsonObject(json.tiles);
  level.par = json.par;
  level.text = json.text || "";
  level.index = json.index;
  level.isIcon = !!(json.isIcon);
  if (json.id) {
    level.id = json.id;
  } else {
    level.id = generate_id("level")
  }
  let hasValidSolution = false;
  if (json.solutionVector) {
    level.solutionVector = json.solutionVector
    level.solutionType = json.solutionType;

    hasValidSolution = level_check_solution(level);
  }
  if (!hasValidSolution) {
    compute_gaussian_solution(level);

  }
  // Sanity check, that solution makes sense
  assert(level_check_solution(level));
  let par = vector_sum(level.solutionVector);
  level.par = par;

  return level;
};

Level.prototype.toJsonObject = function () {
  var json = {};
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
  json.index = this.index;
  json.id = this.id;

  json.solutionVector = this.solutionVector;
  json.solutionType = this.solutionType;

  json.__type__ = "Level"
  return json;
};

Level.prototype.clone = function () {
  var level = new Level();
  level.copyFrom(this);
  return level;
};

Level.prototype.copyFrom = function (otherLevel) {
  this.colorScheme = otherLevel.colorScheme;
  this.tileShape = otherLevel.tileShape;
  this.tiles = otherLevel.tiles.clone();
  this.par = otherLevel.par;
  this.text = otherLevel.text;
  this.index = otherLevel.index;
  this.isIcon = otherLevel.isIcon;
  if (otherLevel.solutionVector) {
    this.solutionVector = otherLevel.solutionVector.slice();
  } else {
    this.solutionVector = null;
  }
  this.solutionType = otherLevel.solutionType;
};

Level.prototype.getFullIdentifier = function() {
  // Contains the id of the level, as well as information that can be used to recreate the level.
  return get_level_full_identifier(this);
}

Level.prototype.getBestNumMoves = function() {
  return getBestNumMoves(this);
}

