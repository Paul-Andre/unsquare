import {Level} from "../core/Level"
import { BoundedGrid, Grid } from "./Grid";
import { assert } from '../utils/helpers.ts';


export type Geometry = {
  type: "square";
  width: number;
  height: number;
};

export type Arithmetic = {
  type: "modular";
  modulus: number;
};

export type Move = {
  x: number;
  y: number;
  size: number;
};

export function compute_operations(geometry:Geometry): number[][] {
  let operations: number[][] = [];
  if (geometry.type == "square") {
    let w = geometry.width;
    let h = geometry.height;
    for (let i = 0; i < w; i++) {
      for (let j = 0; j < h; j++) {
        for (let s = 2; i + s <= w && j + s <= h; s++) {
          let arr = new Array(w * h).fill(0);
          for (let ii = 0; ii < s; ii++) {
            for (let jj = 0; jj < s; jj++) {
              let x = i + ii;
              let y = j + jj;
              arr[x + y * w] = 1;
            }
          }
          operations.push(arr);
        }
      }
    }
    return operations;
  }
  throw new Error(`geometry ${JSON.stringify(geometry)} not supported`);
}

export function compute_operation_borders(geometry:Geometry): number[][] {
  let operations: number[][] = [];
  if (geometry.type == "square") {
    let w = geometry.width;
    let h = geometry.height;
    for (let i = 0; i < w; i++) {
      for (let j = 0; j < h; j++) {
        for (let s = 2; i + s <= w && j + s <= h; s++) {
          let arr = new Array(w * h).fill(0);
          for (let ii = 0; ii < s; ii++) {
            for (let jj = 0; jj < s; jj++) {
              let x = i + ii;
              let y = j + jj;
              arr[x + y * w] = 1;
            }
          }
          operations.push(arr);
        }
      }
    }
    return operations;
  }
  throw new Error(`geometry ${JSON.stringify(geometry)} not supported`);
}

// Convert operation index to move coordinates {x, y, size}
export function compute_moves(geometry:Geometry): Move[] {
  if (geometry.type !== "square") {
    throw new Error(`geometry ${JSON.stringify(geometry)} not supported`);
  }
  
  const width = geometry.width;
  const height = geometry.height;
  let index = 0;
  let moves: Move[] = [];

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      for (let size = 2; x + size <= width && y + size <= height; size++) {
        moves.push({ x, y, size });
      }
    }
  }
  
  return moves;
}

// TODO: remove all usecases of this function. 
export function operation_index_to_move(geometry:Geometry, opIndex: number): Move {
  return compute_moves(geometry)[opIndex];
}

export function get_geometry_m(geometry:Geometry): number {
  return compute_operations(geometry).length;
}

export function vector_sum(v: number[]): number {
  let sum = 0;
  for (let i = 0; i < v.length; i++) {
    sum += v[i];
  }
  return sum;
}

export function vector_equal(a: number[], b: number[]): boolean {
  if (a.length != b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

export function compute_operations_for_level(level:Level): number[][] {
  if (level.geometry) {
    return compute_operations(level.geometry);
  } else if (level.tileShape.name == "square") {
    return compute_operations({
      type: "square",
      width: level.tiles.width,
      height: level.tiles.height,
    });
  }
  throw new Error("Did not understand how to compute operations for level");
}

// Oh god, the duplication...
export function compute_moves_for_level(level:Level): Move[] {
  if (level.geometry) {
    return compute_moves(level.geometry);
  } else if (level.tileShape.name == "square") {
    return compute_moves({
      type: "square",
      width: level.tiles.width,
      height: level.tiles.height,
    });
  }
  throw new Error("Did not understand how to compute operations for level");
}

// TODO: whaaaaat the heeeeeeell ohhhh myyyyy goooood no waaayayayayay
// what is this coding style bruv
// fix it

export function level_get_geometry(level:Level): Geometry {
  if (level.geometry) {
    return level.geometry;
  }
  if (level.tileShape.name == "square") {
    return {
      type: "square",
      width: level.tiles.width,
      height: level.tiles.height,
    };
  }
  throw new Error("No geometry found for level");
}

export function vector_add(a: number[], b: number[]): number[] {
  assert(a.length == b.length);
  let c = new Array(a.length).fill(0);
  for (let i = 0; i < a.length; i++) {
    c[i] = a[i] + b[i];
  }
  return c;
}

export function vector_sub(a: number[], b: number[]): number[] {
  assert(a.length == b.length);
  let c = new Array(a.length).fill(0);
  for (let i = 0; i < a.length; i++) {
    c[i] = a[i] - b[i];
  }
  return c;
}

export function vector_self_add(self: number[], other: number[]): number[] {
  assert(self.length == other.length);
  for (let i = 0; i < self.length; i++) {
    self[i] += other[i];
  }
  return self;
}
export function vector_self_sub(self: number[], other: number[]): number[] {
  assert(self.length == other.length);
  for (let i = 0; i < self.length; i++) {
    self[i] -= other[i];
  }
  return self;
}
export function vector_apply_modulus(self: number[], modulus: number): void {
  for (let i = 0; i < self.length; i++) {
    self[i] %= modulus;
    self[i] += modulus;
    self[i] %= modulus;
  }
}

export function vector_simplify_arithmetic(vector: number[], arithmetic: Arithmetic | null): void {
  if (!arithmetic) {
    // TODO: probably better to create an object for natural arithmetic
  } else if (arithmetic.type == "modular") {
    vector_apply_modulus(vector, arithmetic.modulus);
  } else {
    throw new Error(`arithmetic ${JSON.stringify(arithmetic)} not supported`);
  }
}

export function get_geometry_compact(geometry:Geometry): string {
  if (geometry.type == "square") {
    return `s_${geometry.width}_${geometry.height}`;
  }
  throw new Error(`geometry ${JSON.stringify(geometry)} not supported`);
}
export function get_arithmetic_compact(arithmetic:Arithmetic): string {
  if ((arithmetic.type = "modular")) {
    return `m_${arithmetic.modulus}`;
  }
  throw new Error(`arithmetic ${JSON.stringify(arithmetic)} not supported`);
}

export function get_level_compact_tiles(level:Level): string {
  // todo: make a lowercase "t" for cases where the digits fit.
  // for (let i=0; i<level.tiles.length; i++) {
  //   assert(level.tiles[i]>= 1 level.tiles[i] <= 9);
  // }

  return (
    get_geometry_compact(level_get_geometry(level)) +
    "$" +
    get_arithmetic_compact(level_get_arithmetic(level)) +
    "$" +
    "t$" +
    level.tiles.toFlatArray().join("_")
  );
  // If do to2dArray() instead of array, then magically works... maybe want that?
}

export function get_level_full_identifier(level:Level): string {
  return level.id + "$" + get_level_compact_tiles(level);
}

// TODO: Stupid function name. This function returns the "compact" string
// representing the level by transmitting its solution
// And it's not even the most compact representation...
// small "s" is the compact version, big "S" is the version with underscores.
export function get_level_compact_solution(level:Level): string {
  let solution = (level.solutions && level.solutions.length > 0) ? level.solutions[0] : [];
  return (
    get_geometry_compact(level_get_geometry(level)) +
    "$" +
    get_arithmetic_compact(level_get_arithmetic(level)) +
    "$" +
    "v$" +
    solution.join("")
  );
}

export function vector_multiply_matrix(applications: number[], operations: number[][], arithmetic: Arithmetic|null = null): number[] {
  let m = applications.length;
  assert(operations.length == m);
  let n = operations[0].length;
  let ret = new Array(n).fill(0);
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      ret[j] += applications[i] * operations[i][j];
    }
    vector_simplify_arithmetic(ret, arithmetic);
  }
  return ret;
}

export const MOD_2: Arithmetic = {
  type: "modular",
  modulus: 2,
};

export function transpose_matrix<T>(a: T[][]): T[][] {
  let m = a.length;
  let n = a[0].length;
  let ret: T[][] = [];
  for (let i = 0; i < n; i++) {
    let rr = [];
    for (let j = 0; j < m; j++) {
      rr.push(a[j][i]);
    }
    ret.push(rr);
  }
  return ret;
}

// Aw man, gaussian elimination
export function solve_gaussian(operations: number[][], tiles: number[], arithmetic: Arithmetic): {solution: number[], kernel: number[][]} | null {
  let mat = transpose_matrix(operations);
  let target = tiles.slice();

  assert(arithmetic.type === "modular");
  // Temporary, can allow any prime number
  // The only thing that needs to be figured out is when a ^= is a += and when it is a -=
  assert(arithmetic.modulus === 2);
  let mod = arithmetic.modulus;

  let m = mat.length;
  let n = mat[0].length;
  assert(target.length == m);
  let r = 0;
  let c = 0;
  while (r < m && c < n) {
    let rr = -1;
    for (let i = r; i < m; i++) {
      if (mat[i][c] == 1) {
        rr = i;
        break;
      }
    }
    if (rr == -1) {
      c++;
      continue;
    }
    for (let j = 0; j < n; j++) {
      let tmp = mat[rr][j];
      mat[rr][j] = mat[r][j];
      mat[r][j] = tmp;
    }
    {
      let tmp = target[rr];
      target[rr] = target[r];
      target[r] = tmp;
    }

    for (let i = 0; i < m; i++) {
      if (i != r && mat[i][c]) {
        for (let j = 0; j < n; j++) {
          mat[i][j] ^= mat[r][j];
        }
        target[i] ^= target[r];
      }
    }
    r++;
    c++;
  }
  let solution = new Array(n).fill(0);
  let c2r = new Array(n).fill(-1);
  let r2c = new Array(m).fill(-1);

  for (let i = 0; i < m; i++) {
    let cc = -1;
    for (let j = 0; j < n; j++) {
      if (mat[i][j] == 1) {
        cc = j;
        break;
      }
    }
    if (cc != -1) {
      c2r[cc] = i;
      r2c[i] = cc;
    }
    if (cc == -1) {
      if (target[i] != 0) {
        return null;
      }
    } else {
      solution[cc] = target[i];
    }
  }

  let kernelBasis = [];
  //vector<vector<int>> kernelBasis;
  for (let j = 0; j < n; j++) {
    if (c2r[j] == -1) {
      let repr = new Array(n).fill(0);
      repr[j] = 1;
      for (let i = 0; i < m; i++) {
        if (mat[i][j] == 1) {
          repr[r2c[i]] = 1;
        }
      }
      kernelBasis.push(repr);
    }
  }

  // sanity check. Vectors in kernel must project to zero
  // for(const vector<int> &kernel: kernelBasis){
  for (let kbi = 0; kbi < kernelBasis.length; kbi++) {
    let kernel = kernelBasis[kbi];
    let repr = new Array(m).fill(0);
    for (let i = 0; i < n; i++) {
      if (kernel[i]) {
        vector_self_add(repr, operations[i]);
        vector_apply_modulus(repr, mod);
      }
    }
    assert(vector_sum(repr) == 0);
  }

  // sanity check, that the solution actually multiplies to the desired value
  {
    let target_reach = vector_multiply_matrix(solution, operations, arithmetic);
    assert(vector_equal(tiles, target_reach));
  }

  let ret = {
    solution:solution,
    kernel: kernelBasis,
  };

  return ret;
}

export function get_level_tiles_vector(level:Level): number[] {
  let tilesVector = level.tiles.toFlatArray();
  for (let i = 0; i < tilesVector.length; i++) {
    tilesVector[i] -= 1;
  }
  return tilesVector;
}

export function level_get_arithmetic(level:Level): Arithmetic {
  return level.colorScheme.arithmetic;
}

export function level_check_solution(level:Level, solution: number[]): boolean {
  let target = get_level_tiles_vector(level);
  let operations = compute_operations_for_level(level);

  let reach = vector_multiply_matrix(solution, operations, level_get_arithmetic(level));

  return vector_equal(target, reach);
}

export function get_gaussian_solution_for_level(level:Level): number[] | null {
  let arithmetic = level.colorScheme.arithmetic;
  let operations = compute_operations_for_level(level);
  let tilesVector = get_level_tiles_vector(level);

  let sol = solve_gaussian(operations, tilesVector, arithmetic);
  if (sol) {
    return sol.solution;
  }
  return null;
}


export function ericTilesPartition(level: Level, solution: number[]): Set<string> {
  let operations = compute_operations_for_level(level);
  assert(operations.length == solution.length);
  let m = new Set<string>();
  let emptyArea = "0".repeat(vector_sum(solution));
  m.add(emptyArea);
  for (let j=0; j<operations[0].length; j++) {
    let s = "";
    for (let i=0; i<operations.length; i++) {
      if (!solution[i]) continue;
      if (operations[i][j] ) {
        s+="1";
      }else {
        s+="0";
      }
    }
    m.add(s);
  }
  return m;
}

// TODO: for the complexity metrics, such as eric_partition_number and obviousScore, perhaps have a function that computes the minimum for all the solutions contained in the level.

export function ericTilesNumber(level: Level, solution: number[]): number {
  let m = ericTilesPartition(level, solution);
  return m.size;
}

// For now this is just some boilerplate, it doesn't actually do what I want it to do yet.
export function ericBordersPartition(level:Level, solution: number[], squares: Move[] | null = null): Set<string> {
  squares = squares || compute_moves_for_level(level);
  let grid = level.tiles;
  let cnt = solution.length;
  let tot = 0;

  let width = grid.width;
  let height = grid.height;

  let m = new Set<string>();
  // vertical borders
  for (let x = 0; x <= width; x++) {
    for (let y = 0; y < height; y++) {
      let s = "";
      for (let i = 0; i < solution.length; i++) {
        if (!solution[i]) continue;
        let square = squares[i];
        if ( (y>= square.y && y < square.y+square.size) &&
            (x == square.x || x == square.x + square.size)) {
          s+="1";
        }else {
          s+="0";
        }
      }
      m.add(s);
    }
  }

    // horizontal borders
    for (let x = 0; x < width; x++) {
      for (let y = 0; y <= height; y++) {
        let s = "";
        for (let i = 0; i < solution.length; i++) {
          if (!solution[i]) continue;
          let square = squares[i];
          if ( (x>= square.x && x < square.x+square.size) &&
              (y == square.y || y == square.y + square.size)) {
            s+="1";
          }else {
            s+="0";
          }
        }
        m.add(s);
      }
    }
  return m;
}

export function ericBordersNumber(level:Level, solution: number[], squares: Move[] | null = null): number {
  let m = ericBordersPartition(level, solution, squares);
  return m.size;
}

export function ericUnionNumber(level:Level, solution: number[], squares: Move[] | null = null): number {
  let m = ericTilesPartition(level, solution)
  ericBordersPartition(level, solution, squares).forEach(item => m.add(item));
  return m.size;
}

export function ericUnionWeightedNumber(
    level:Level, solution: number[],
      weightTiles: number = 1, weightBorders: number = 0.5,
      squares: Move[] | null = null): number {
  let tiles = ericTilesPartition(level, solution);
  let borders = ericBordersPartition(level, solution, squares);
  let tot = 0;
  tiles.forEach(item => {
    tot += weightTiles;
  });
  borders.forEach(item => {
    if (tiles.has(item)) {
      return;
    }
    tot += weightBorders;
  });
  return tot;
}

export function move_border_count(grid: BoundedGrid<number>, square: Move): number {
  let tot = 0;
  let virt = grid.virtual(()=>1);
  for (let i=0; i<square.size; i++) {
    tot += +(virt.get(square.x-1, square.y+i) != virt.get( square.x, square.y+i));
    tot += +(virt.get(square.x+square.size-1, square.y+i) != virt.get(square.x+square.size, square.y+i));
    tot += +(virt.get(square.x+i, square.y-1)!= virt.get( square.x+i, square.y));
    tot += +(virt.get( square.x+i, square.y+square.size-1)!= virt.get(square.x+i, square.y+square.size));
  }
  //cerr << tot <<"/"<<goal<<endl;
  return tot;
}

export function solution_to_grid(level: Level, solution: number[]): BoundedGrid<number> {
  let operations = compute_operations_for_level(level);
  let tilesVector = vector_multiply_matrix(solution, operations, level_get_arithmetic(level));
  tilesVector = tilesVector.map(a => a + 1);
  return Grid.usingFlatArray(tilesVector, level.tiles.width, level.tiles.height);
}

export function obviousScore(level:Level, solution: number[], squares: Move[] | null = null): number {
  //debugger;
  squares = squares || compute_moves_for_level(level);
  
  // Calculate the grid from the solution instead of using level.tiles
  let grid = solution_to_grid(level, solution);
  
  
  let cnt = solution.length;
  let tot = 0;
  for (let i = 0; i < solution.length; i++) {
    let square = squares[i];

    let border = move_border_count(grid, square);
    let sides = square.size * 4;



    let obv = border / sides;


    let diff = Math.abs(obv - solution[i]);
    tot += diff * diff;
    //tot += diff;
  }
  // Iterate over every 1x1 tile
  if (false) {
    for (let x = 0; x < grid.width; x++) {
      for (let y = 0; y < grid.height; y++) {
        let square = {x: x, y: y, size: 1};
        let border = move_border_count(grid, square);
        let sides = 4;

        let obv = border / sides;
        let diff = Math.abs(obv - 0);
        tot += diff * diff;
        //tot += diff;
      }
    }
  }



  let ret = tot / cnt;
  return ret;
}

export function getBlackBoundingBox(grid: BoundedGrid<number>): {minX: number, minY: number, maxX: number, maxY: number} {
  let minX = grid.width;
  let minY = grid.height;
  let maxX = 0;
  let maxY = 0;
  for (let x = 0; x < grid.width; x++) {
    for (let y = 0; y < grid.height; y++) {
      if (grid.get(x, y) != 0) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  return {minX: minX, minY: minY, maxX: maxX, maxY: maxY};
}

export function boundingBoxAreaScore(level:Level, solution: number[], squares: Move[] | null = null): number {
  let grid = solution_to_grid(level, solution);
  let {minX, minY, maxX, maxY} = getBlackBoundingBox(grid);
  let width = maxX - minX + 1;
  let height = maxY - minY + 1;
  let area = width * height;
  let score = area / (grid.width * grid.height);
  return score;
}

export function fractionBlackScore(level:Level, solution: number[], squares: Move[] | null = null): number {
  let grid = solution_to_grid(level, solution);
  let tot = 0;
  grid.forEach(cell => {
    if (cell == 2) {
      tot++;
    }
  });
  let score = tot / (grid.width * grid.height);
  return score;
}

export function involvedScore(level:Level, solution: number[], squares: Move[] | null = null): number {
  let grid = Grid.fill(level.tiles.width, level.tiles.height, 0);
  squares = squares || compute_moves_for_level(level);
  for (let i = 0; i < solution.length; i++) {
    if (solution[i]) {
      let square = squares[i];
      grid.set(square.x, square.y, 1);
    }
  }
  let score = grid.sum() / (grid.width * grid.height);
  return score;
}
