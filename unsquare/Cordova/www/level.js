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
  level.solution = [];
  level.text = "";
  level.index = -1;
  level.isIcon = false;
  level.id = generate_id("level");

  let operations = compute_operations_for_level(level);
  let m = operations.length;
  
  level.solutionVector = new Array(m).fill(0);

  return level;
};

Level.fromJsonObject = function (json) {
  var level = new Level();
  level.colorScheme = colorSchemes.BW; //colorSchemes[json.colorScheme];
  level.tileShape = tileShapes.square; // tileShapes[json.tileShape];
  level.tiles = level.tileShape.gridFromJsonObject(json.tiles);
  level.par = json.par;
  level.solution = []; //json.solution;
  level.text = json.text || "";
  level.index = json.index;
  level.isIcon = !!(json.isIcon);
  if (json.id) {
    level.id = json.id;
  } else {
    level.id = generate_id("level")
  }
  if (json.solutionVector) {
    level.solutionVector = json.solutionVector
  } else {
    level.solutionVector = null;
  }
  return level;
};

Level.prototype.toJsonObject = function () {
  var json = {};
  json.colorScheme = this.colorScheme.name;
  json.tileShape = this.tileShape.name;
  json.tiles = this.tiles.to2dArray(); //TODO: should be tileShape.gridToJson...
  json.par = this.par;
  json.solution = this.solution;
  if (this.text) {
    json.text = this.text;
  }
  if (this.isIcon) {
    json.isIcon = this.isIcon;
  }
  json.index = this.index;
  json.id = this.id;

  if (this.solutionVector) {
    json.solutionVector = this.solutionVector
  }

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
  this.solution = otherLevel.solution.slice();
  this.text = otherLevel.text;
  this.index = otherLevel.index;
  this.isIcon = otherLevel.isIcon;
  this.solutionVector = otherLevel.solutionVector;
};
