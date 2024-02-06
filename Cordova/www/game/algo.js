"use strict";

function assert(a) {
  if (!a) {
    throw Error("Assertion failed");
  }
}

function compute_operations(geometry) {
  let operations = [];
  if (geometry.type == "square") {
    let w = geometry.width;
    let h = geometry.height;
    for (let i=0; i<w; i++) {
      for (let j=0; j<h; j++) {
        for (let s=2; i+s<=w && j+s<=h; s++) {
          let arr = new Array(w*h).fill(0);
          for (let ii=0; ii<s; ii++) {
            for (let jj=0; jj<s; jj++) {
              let x = i+ii;
              let y = j+jj;
              arr[x + y*w] = 1
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

function get_geometry_m(geometry) {
  return compute_operations(geometry).length;
}

function vector_sum(v) {
  let sum = 0;
  for (let i=0; i<v.length; i++) {
    sum+=v[i];
  }
  return sum;
}

function vector_equal(a,b) {
  if (a.length != b.length) {
    return false;
  }
  for (let i=0; i<a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}
{
  assert(vector_equal([1,2,3], [1,2,3]));
  assert(vector_equal([1,2,3], [1,2,2]) == false);
  assert(vector_equal([], []));
}

function compute_operations_for_level(level) {
  if (level.geometry) {
    return compute_operations(level.geometry);
  } else if (level.tileShape.name == "square")  {
    return compute_operations({
      type: "square",
      width: level.tiles.width,
      height: level.tiles.height,
    })
  }
  console.log(level)
  throw new Error("Did not understand how to compute operations for level");
}


// TODO: whaaaaat the heeeeeeell ohhhh myyyyy goooood no waaayayayayay
// what is this coding style bruv
// fix it

function level_get_geometry(level) {
  if (level.geometry) {
    return level.geometry;
  }
  if (level.tileShape.name == "square") {
    return {
      type: "square",
      width: level.tiles.width,
      height: level.tiles.height,
    }
  }
  console.log(level)
  return "what is this?"
}


function vector_add(a, b) {
  assert(a.length == b.length);
  let c = new Array(a.length).fill(0);
  for (let i=0; i<a.length; i++) {
    c[i] = a[i]+b[i];
  }
  return c;
}

function vector_self_add(self, other) {
  assert(self.length == other.length);
  for (let i=0; i<self.length; i++) {
    self[i] += other[i];
  }
  return self;
}
function vector_self_sub(self, other) {
  assert(self.length == other.length);
  for (let i=0; i<self.length; i++) {
    self[i] -= other[i];
  }
  return self;
} 
function vector_apply_modulus(self, modulus) {
  for (let i=0; i<self.length; i++) {
    self[i] %= modulus;
    self[i] += modulus;
    self[i] %= modulus;
  }
}

function vector_simplify_arithmetic(vector, arithmetic) {
  if (!arithmetic) {
    // nothing (but probably better to create null object for natural arithmetic

  } else if (arithmetic.type == "modular") {
    vector_apply_modulus(vector, arithmetic.modulus);
  } else {
    throw new Error(`arithmetic ${JSON.stringify(arithmetic)} not supported`);
  }
}

function get_geometry_compact(geometry) {
  if (geometry.type == "square") {
    return `s_${geometry.width}_${geometry.height}`
  }
  throw new Error(`geometry ${JSON.stringify(geometry)} not supported`);
}
function get_arithmetic_compact(arithmetic) {
  if (arithmetic.type = "modular") {
    return `m_${arithmetic.modulus}`
  }
  throw new Error(`arithmetic ${JSON.stringify(geometry)} not supported`);
}


function get_level_compact_tiles(level) {

  // todo: make a lowercase "t" for cases where the digits fit.
  // for (let i=0; i<level.tiles.length; i++) {
  //   assert(level.tiles[i]>= 1 level.tiles[i] <= 9);
  // }

  return get_geometry_compact(level_get_geometry(level))+"$"+
    get_arithmetic_compact(level_get_arithmetic(level))+"$"+
    "t$"+level.tiles.array.join("_");
  // If do to2dArray() instead of array, then magically works... maybe want that?
}

function get_level_full_identifier(level) {
  return level.id +"$"+get_level_compact_tiles(level)
}

// TODO: Stupid function name. This function returns the "compact" string
// representing the level by transmitting its solution
// And it's not even the most compact representation...
// small "s" is the compact version, big "S" is the version with underscores.
function get_level_compact_solution(level) {
  return get_geometry_compact(level_get_geometry(level))+"$"+
    get_arithmetic_compact(level_get_arithmetic(level))+"$"+
    "v$_"+level.solutionVector.join("_");
}

function vector_multiply_matrix(applications, operations, arithmetic) {
  let m = applications.length;
  assert(operations.length == m);
  let n = operations[0].length;
  let ret = new Array(n).fill(0);
  for (let i=0; i<m; i++) {
    for (let j=0; j<n; j++) {
      ret[j] += applications[i]*operations[i][j];
    }
    vector_simplify_arithmetic(ret, arithmetic);
  }
  return ret;
}

let MOD_2 = {
  type: "modular",
  modulus: 2,
}


function transpose_matrix(a) {
  let m = a.length;
  let n = a[0].length;
  let ret = []
  for (let i=0; i<n; i++) {
    let rr = [];
    for (let j=0; j<m; j++) {
      rr.push(a[j][i]);
    }
    ret.push(rr);
  }
  return ret;
}

{
  let a = [[0,1,2],[3,4,5]];
  let b = transpose_matrix(a);
  console.log("transpose_matrix", a, b);
}
{
  let a = [1,0,1];
  let b = [[1,0,1,0], [0,1,0,0], [0,0,0,1]];
  test_multiply_and_gaussian(a,b);
}

// Used to rapidly create tests where it's possible to have
function test_multiply_and_gaussian(a,b) {
  let c= vector_multiply_matrix(a, b);
  vector_apply_modulus(c, 2);
  console.log(a,b,c);
  let ret = solve_gaussian(b, c, MOD_2);
  console.log(ret,b,c);
}
{
  let a = [1,0,1];
  let b = [[1,0,1,0], [1,0,0,0], [0,0,1,0]];
  test_multiply_and_gaussian(a,b);
}

function random_vector(n, mod) {
  let rr = [];
    for (let j=0; j<n; j++) {
      rr.push(Math.floor(Math.random()*mod));
    }
  return rr;
}
function random_matrix(m, n, mod) {
  let ret = [];
  for (let i=0; i<m; i++) {
    let rr = [];
    for (let j=0; j<n; j++) {
      rr.push(Math.floor(Math.random()*mod));
    }
    ret.push(rr);
  }
  return ret;
}

if (false) {
  for (let i=0; i<100; i++) {
    let n = Math.floor(Math.random() *10) + 1;
    let m = Math.floor(Math.random() *10) + 1;
    let a = random_vector(m, 2);
    let b = random_matrix(m,n, 2);
    test_multiply_and_gaussian(a,b);
  }
}



// Aw man, gaussian elimination
function solve_gaussian(operations, tiles, arithmetic) {
  let mat = transpose_matrix(operations);
  let target = tiles.slice();

  assert(arithmetic.type === "modular");
  // Temporary, can allow any prime number
  // The only thing that needs to be figured out is when a ^= is a += and when it is a -=
  assert(arithmetic.modulus === 2);
  let mod = arithmetic.modulus;

  let m = mat.length
  let n = mat[0].length
  assert(target.length == m);
  let r = 0;
  let c = 0;
  while(r<m && c<n){
    let rr = -1;
    for (let i=r; i<m; i++) {
      if (mat[i][c]==1) {
        rr = i;
        break;
      }
    }
    if (rr == -1) {
      c++;
      continue;
    }
    for(let j=0; j<n; j++) {
      let tmp = mat[rr][j];
      mat[rr][j] = mat[r][j];
      mat[r][j] = tmp;
    }
    {
      let tmp = target[rr];
      target[rr] = target[r];
      target[r] = tmp;
    }

    for (let i=0; i<m; i++){
      if (i!=r && mat[i][c]) {
        for (let j=0; j<n; j++) {
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

  for(let i=0; i<m; i++){
    let cc = -1;
    for(let j=0; j<n; j++){
      if(mat[i][j]==1){
        cc = j;
        break;
      }
    }
    if (cc!=-1) {
      c2r[cc] = i;
      r2c[i] = cc;
    }
    if (cc==-1) {
      if (target[i]!=0){
        return null;
      }
    } else {
      solution[cc] = target[i];
    }
  }

  let kernelBasis = []
  //vector<vector<int>> kernelBasis;
  for(let j=0; j<n; j++){
    if(c2r[j] == -1) {
      let repr = new Array(n).fill(0);
      repr[j] = 1;
      for(let i=0; i<m; i++) {
        if(mat[i][j]==1){
          repr[r2c[i]] = 1;
        }
      }
      kernelBasis.push(repr);
    }
  }

  // sanity check. Vectors in kernel must project to zero
  // for(const vector<int> &kernel: kernelBasis){
  for (let kbi = 0; kbi<kernelBasis.length; kbi++) {
    let kernel = kernelBasis[kbi];
    let repr = new Array(m).fill(0);
    for(let i=0; i<n; i++) {
      if(kernel[i]){
        vector_self_add(repr, operations[i]);
        vector_apply_modulus(repr,mod);
      }
    }
    assert(vector_sum(repr) == 0);
  }

  // sanity check, that the solution actually multiplies to the desired value
  {
    let target_reach = vector_multiply_matrix(solution, operations, arithmetic);
    // console.log("want", solution, operations, tiles);
    // console.log("got", solution, operations, target_reach);
    assert(vector_equal(tiles, target_reach));
  }
  

  let ret = {};
  ret.solution = solution;
  ret.kernel = kernelBasis;

  return ret;
}

function get_level_tiles_vector(level) {

  let tilesVector = level.tiles.array.slice();
  for (let i=0; i<tilesVector.length; i++) {
    tilesVector[i]-=1;
  }
  return tilesVector;

}


function level_get_arithmetic(level) {
  return level.colorScheme.arithmetic;
}


function level_check_solution(level, solution=null) {
    if (solution===null) {
      solution = level.solutionVector;
    }
    let target = get_level_tiles_vector(level);
    let operations = compute_operations_for_level(level);

    let reach = vector_multiply_matrix(solution, operations)
    vector_simplify_arithmetic(reach, level_get_arithmetic(level));
    //console.log(reach, target);

    return vector_equal(target, reach);

}

function get_gaussian_solution_for_level(level) {
  //let level.tiles.array
  let arithmetic = level.colorScheme.arithmetic;
  let operations = compute_operations_for_level(level);
  //console.log(
  let tilesVector = get_level_tiles_vector(level);

  let sol = solve_gaussian(operations, tilesVector, arithmetic);
  if (sol) {
    return sol.solution;
  }
  return null;
}



