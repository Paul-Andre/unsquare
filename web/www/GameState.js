"use strict";

class GameState {
  constructor(level) {
    const tileStates = level.tiles.clone();
    tileStates.forEachSet(function () {
      // TODO: ok, but seriously, does this make sense?
      // Maybe put the animation in a separate object, or combine the tileState
      // value with these? idk... I guess whatever this is works for now...
      return {
        selected: false,
        oldSelected: false,
        insetState: 0,
        reverseInsetState: 1,
        transitionState: 1,
      };
    });

    this.tiles = level.tiles.clone();
    this.tileStates = tileStates;

    this.level = level;
    this.undoList = [];
    this.lastUpdateTimestamp = performance.now();
    this.numMoves = 0;
    this.runningSolution = level.solutionVector.slice();

    this.operations = compute_operations_for_level(this.level);
    this.inverseOperations = new Map();
    for (let i = 0; i < this.operations.length; i++) {
      this.inverseOperations.set(this.operations[i].join(""), i);
    }
  }

  applyMove(move, action) {
    if (move != null) {
      this.undoList.push({
        tiles: this.tiles.clone(),
        move: move,
        runningSolution: this.runningSolution.slice(),
      });

      this.level.tileShape.forTilesInMoveSet(this.tiles, move, action);
      let vector = this.level.tileShape.moveToVector(this.tiles, move);
      let opIndex = this.inverseOperations.get(vector.join(""));
      // console.log(vector);
      // console.log(opIndex);
      if (this.runningSolution) {
        this.runningSolution[opIndex] += 1;
        vector_simplify_arithmetic(this.runningSolution, this.arithmetic);
      }
    }
    this.numMoves += 1;
  }

  // Returns either a move
  // or "undo" or "restart"
  getHint() {
    // TODO
  }

  // TODO: make undo be at a different level
  undo() {
    if (this.undoList.length > 0) {
      const undo = this.undoList.pop();
      this.tiles = undo.tiles;
      
      // Handle restart operations differently
      if (undo.isRestart) {
        // For restart, we just restore the state without animation
        this.runningSolution = undo.runningSolution;
        this.numMoves = undo.numMoves || (this.numMoves - 1);
      } else {
        // For regular moves, animate the reverse
        this.level.tileShape.forTilesInMove(this.tileStates,
          undo.move,
          function(ts) {
            ts.transitionState = 0;
          }
        );
        this.runningSolution = undo.runningSolution;
        this.numMoves -= 1;
      }
    }
  }
}
