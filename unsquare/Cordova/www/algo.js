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

function vector_self_add(self, other) {
  assert(self.length == other.length);
  for (let i=0; i<self.length; i++) {
    self[i] += other[i];
  }
}
function vector_self_sub(self, other) {
  assert(self.length == other.length);
  for (let i=0; i<self.length; i++) {
    self[i] -= other[i];
  }
} 
function vector_apply_modulus(vector, modulus) {
  for (let i=0; i<self.length; i++) {
    self[i] %= modulus;
    self[i] += modulus;
    self[i] %= modulus;
  }
}

function vector_simplify_arithmetic(vector, arithmetic) {
  if (arithmetic.type == "modular") {
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

  return get_geometry_compact(level.geometry)+"$"+
    get_arithmetic_compact(level.arithmetic)+"$"+
    "T_"+level.tiles.join("_");
}

function get_level_full_identifier(level) {
  level.id +"$"+get_level_compact_tiles(level)
}

