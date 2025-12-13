// Usage: node view_levels.js <json_file>
const fs = require('fs');

function compute_moves(width, height) {
  let moves = [];
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      for (let size = 2; x + size <= width && y + size <= height; size++) {
        moves.push({ x, y, size });
      }
    }
  }
  return moves;
}

function printLevel(level) {
  const tiles = level.tiles;
  const height = tiles.length;
  const width = tiles[0].length;
  
  console.log('\nLevel:');
  for (let y = 0; y < height; y++) {
    // console.log(tiles[y].join(' '));
    console.log(tiles[y].map(t => ({"1":".","2":"#"}[t])).join(' '));
  }
  
  const moves = compute_moves(width, height);
  const solutions = level.solutions || [];
  
  for (let i = 0; i < solutions.length; i++) {
    const solution = solutions[i];
    const squares = [];
    for (let j = 0; j < solution.length; j++) {
      if (solution[j] === 1) {
        squares.push(moves[j]);
      }
    }
    console.log(`\nSolution ${i + 1}:`);
    squares.forEach(sq => console.log(JSON.stringify(sq)));
  }
}

const filename = process.argv[2];
if (!filename) {
  console.error('Usage: node view_levels.js <json_file>');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
const levels = data.levels || [];

levels.forEach((level, idx) => {
  console.log(`\n=== Level ${idx + 1} ===`);
  printLevel(level);
});

