#!/usr/bin/env python3
"""
Solver script for Unflip levels.

This script:
1. Reads a JSON file containing levels
2. For each BW (Black/White) level:
   - Converts the tiles to binary format
   - Runs toZnDual.cpp to generate a MiniZinc data file
   - Solves using MiniZinc
   - Parses the solution and updates the JSON
3. Writes the updated JSON back to a file
"""

import argparse
import json
import re
import subprocess
import sys
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path

# Constants
MINIZINC_TIMEOUT = 300
MODEL_FILE = 'minXorDual.mzn'
CPP_SOURCE = 'toZnDual.cpp'
CPP_EXECUTABLE = 'toZnDual'


@dataclass
class SolveResult:
    """Result of solving a level"""
    solution_vector: list | None
    status: str
    improved: bool = False


def tiles_to_binary_string(tiles):
    """Convert tiles array (1=white, 2=black) to binary string for toZnDual.cpp."""
    return [''.join('1' if cell == 2 else '0' for cell in row) for row in tiles]


def compile_and_run_toZnDual(input_file, solver_dir):
    """Compile toZnDual.cpp (if needed) and run it with the input file"""
    solver_path = Path(solver_dir)
    cpp_file = solver_path / CPP_SOURCE
    exe_file = solver_path / CPP_EXECUTABLE
    
    # Compile if needed
    if not exe_file.exists() or (cpp_file.exists() and cpp_file.stat().st_mtime > exe_file.stat().st_mtime):
        print(f"    Compiling {CPP_SOURCE}...", end=' ', flush=True)
        compile_cmd = ['g++', '-Wall', '-pedantic', '-std=c++17', '-O3', '-o', str(exe_file), str(cpp_file)]
        compile_result = subprocess.run(compile_cmd, capture_output=True, text=True)
        if compile_result.returncode != 0:
            print("✗ FAILED")
            print(f"Compilation error: {compile_result.stderr}", file=sys.stderr)
            return None, None
        print("✓ Done")
    
    # Run
    with open(input_file, 'r') as f:
        run_result = subprocess.run([str(exe_file)], stdin=f, capture_output=True, text=True)
    
    if run_result.returncode != 0:
        print(f"toZnDual error: {run_result.stderr}", file=sys.stderr)
        return None, None
    
    return run_result.stdout, run_result.stderr


def solve_with_minizinc(dzn_file, model_file):
    """Run MiniZinc solver: minizinc model.mzn data.dzn -a --solver highs"""
    cmd = ['minizinc', str(model_file), str(dzn_file), '-a', '--solver', 'highs']
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=MINIZINC_TIMEOUT)
        if result.returncode != 0:
            print(f"MiniZinc error: {result.stderr}", file=sys.stderr)
            return None
        return result.stdout
    except subprocess.TimeoutExpired:
        print("MiniZinc timeout", file=sys.stderr)
        return None


def parse_minizinc_output(output):
    """Parse MiniZinc output to extract the final result vector (solution)."""
    if not output or 'unsolvable' in output.lower():
        return None
    
    matches = re.findall(r'\[([\d,\s]+)\];\s*\d+', output)
    if not matches:
        return None
    
    result_str = matches[-1]
    return [int(x.strip()) for x in result_str.split(',') if x.strip()]


def generate_operations(m, n):
    """Generate all possible square operations for an m×n grid."""
    operations = []
    w, h = n, m  # width = columns, height = rows
    
    for i in range(w):
        for j in range(h):
            for s in range(2, min(w - i, h - j) + 1):
                arr = [0] * (w * h)
                for ii in range(s):
                    for jj in range(s):
                        idx = (i + ii) + (j + jj) * w  # row-major: col + row*width
                        arr[idx] = 1
                operations.append([idx for idx, val in enumerate(arr) if val == 1])
    
    return operations


def verify_solution(tiles, solution_vector):
    """Verify that a solution vector actually solves the puzzle."""
    m, n = len(tiles), len(tiles[0]) if tiles else 0
    
    # Convert tiles to grid vector (row-major: 2=black->1, 1=white->0)
    grid = [1 if tiles[row][col] == 2 else 0 
            for row in range(m) for col in range(n)]
    
    operations = generate_operations(m, n)
    assert len(solution_vector) == len(operations), \
        f"Solution vector length ({len(solution_vector)}) doesn't match operations count ({len(operations)})"
    
    # Apply operations where solution_vector[i] == 1
    result_grid = grid.copy()
    for i, use_op in enumerate(solution_vector):
        if use_op == 1:
            for cell_idx in operations[i]:
                assert cell_idx < len(result_grid), f"Operation {i} references invalid cell index {cell_idx}"
                result_grid[cell_idx] = (result_grid[cell_idx] + 1) % 2
    
    # Check if result is all zeros (all white)
    black_count = sum(result_grid)
    assert all(cell == 0 for cell in result_grid), \
        f"Solution invalid: {black_count} cells still black (should be all white)"


def validate_level(level, force):
    """Check if level can be solved. Returns (can_solve, reason) tuple."""
    if level.get('colorScheme') != 'BW':
        return False, "Not a BW level"
    if level.get('tileShape') != 'square':
        return False, "Not a square tile shape"
    if not level.get('tiles'):
        return False, "No tiles"
    if not force and level.get('solutionType') == 'minizinc':
        return False, "Already solved (minizinc)"
    return True, None


def solve_level(level, solver_dir, force=False):
    """Solve a single level"""
    level_id = level.get('id', 'unknown')
    tiles = level.get('tiles', [])
    m, n = len(tiles), len(tiles[0]) if tiles else 0
    
    print(f"  Level: {level_id}, Grid: {m}×{n}")
    
    # Validate level
    can_solve, reason = validate_level(level, force)
    if not can_solve:
        print(f"    Skipping: {reason}")
        return SolveResult(None, reason, False)
    
    # Verify existing solution if present
    existing_solution = level.get('solutionVector')
    existing_ops = sum(existing_solution) if existing_solution else None
    if existing_solution:
        print(f"    Verifying existing solution ({existing_ops} operations)...", end=' ', flush=True)
        try:
            verify_solution(tiles, existing_solution)
            print("✓ PASSED")
        except AssertionError as e:
            print("✗ FAILED")
            raise AssertionError(f"Existing solution in level {level_id} failed verification: {e}") from e
    
    # Convert tiles to binary and create input file
    print("    Converting tiles to binary format...")
    binary_rows = tiles_to_binary_string(tiles)
    
    solver_path = Path(solver_dir)
    model_file = solver_path / MODEL_FILE
    
    # Create temporary input file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as input_file:
        input_path = Path(input_file.name)
        input_file.write(f"{m} {n}\n")
        input_file.writelines(row + "\n" for row in binary_rows)
    
    try:
        # Run toZnDual.cpp
        print("    Running toZnDual.cpp...")
        dzn_data, stderr_output = compile_and_run_toZnDual(str(input_path), solver_dir)
        if not dzn_data:
            print("    ✗ toZnDual failed")
            return SolveResult(None, "toZnDual failed", False)
        
        if 'unsolvable' in dzn_data:
            print("    ✗ Puzzle is unsolvable")
            return SolveResult(None, "Unsolvable", False)
        
        # Extract dimensions from dzn output
        w_match = re.search(r'W = 1\.\.(\d+)', dzn_data)
        h_match = re.search(r'H = 1\.\.(\d+)', dzn_data)
        if w_match and h_match:
            print(f"    Generated .dzn data: W={w_match.group(1)}, H={h_match.group(1)}")
        
        # Create temporary .dzn file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.dzn', dir=solver_dir, delete=False) as dzn_file:
            dzn_path = Path(dzn_file.name)
            dzn_file.write(dzn_data)
        
        try:
            # Solve with MiniZinc
            print("    Running MiniZinc solver...", end=' ', flush=True)
            solution_output = solve_with_minizinc(dzn_path, model_file)
            
            if not solution_output:
                print("✗ FAILED")
                return SolveResult(None, "MiniZinc solve failed", False)
            
            print("\n    MiniZinc output:")
            print(solution_output.strip())
            print()
            
            # Parse solution
            solution_vector = parse_minizinc_output(solution_output)
            if solution_vector is None:
                print("✗ FAILED to parse")
                return SolveResult(None, "Failed to parse minizinc solution", False)
            
            num_ops = sum(solution_vector)
            print(f"✓ Found solution with {num_ops} operations")
            
            # Compare with existing solution
            improved = False
            if existing_ops is not None:
                print(f"    Previous solution had {existing_ops} operations")
                assert num_ops <= existing_ops, \
                    f"New solution ({num_ops} ops) is WORSE than existing ({existing_ops} ops)!"
                if num_ops < existing_ops:
                    print(f"    ✨ IMPROVED by {existing_ops - num_ops} operation(s)!")
                    improved = True
                else:
                    print("    Same number of operations as before")
            
            # Verify the solution
            print("    Verifying solution...", end=' ', flush=True)
            verify_solution(tiles, solution_vector)
            print("✓ PASSED")
            
            return SolveResult(solution_vector, "Solved", improved)
            
        finally:
            dzn_path.unlink()
    finally:
        input_path.unlink()


def solve_json_file(input_path, output_path, solver_dir, force=False):
    """Process all levels in a JSON file"""
    with open(input_path, 'r') as f:
        data = json.load(f)
    
    # Handle both old format (array of levels) and new format (object with levels array)
    if isinstance(data, list):
        levels = data
        book_data = None
    else:
        levels = data.get('levels', [])
        book_data = data
    
    solved_count = 0
    skipped_count = 0
    improved_levels = []
    
    print(f"\nProcessing {len(levels)} level(s)...\n")
    for i, level in enumerate(levels):
        print(f"[{i+1}/{len(levels)}]", end=' ')
        
        old_solution = level.get('solutionVector')
        old_ops = sum(old_solution) if old_solution else None
        
        start_time = time.perf_counter()
        result = solve_level(level, solver_dir, force)
        elapsed_time = time.perf_counter() - start_time
        
        print(f"    Time: {elapsed_time * 1000:.1f}ms")
        
        if result.solution_vector:
            level['solutionVector'] = result.solution_vector
            level['solutionType'] = 'minizinc'
            solved_count += 1
            if result.improved:
                improved_levels.append((level, old_ops, sum(result.solution_vector), i))
        else:
            skipped_count += 1
            print(f"    Result: ✗ {result.status}")
        print()
    
    # Write output
    if book_data:
        output_data = book_data.copy()
        output_data['levels'] = levels
    else:
        output_data = levels
    
    with open(output_path, 'w') as f:
        json.dump(output_data, f, separators=(',', ':'))
    
    print(f"\nSummary: {solved_count} solved, {skipped_count} skipped")
    
    if improved_levels:
        print(f"\n✨ {len(improved_levels)} level(s) with improved solutions:")
        for level, old_ops, new_ops, index in improved_levels:
            level_id = level.get('id', 'unknown')
            print(f"   - Level {index+1} ({level_id}): {old_ops} → {new_ops} operations (saved {old_ops - new_ops})")
    
    print(f"Output written to: {output_path}")


def main():
    parser = argparse.ArgumentParser(description='Solve Unflip levels using MiniZinc')
    parser.add_argument('input', help='Input JSON file containing levels')
    parser.add_argument('output', nargs='?', help='Output JSON file (default: input with _solved suffix)')
    parser.add_argument('--force', action='store_true', help='Force re-solving of already solved levels')
    
    args = parser.parse_args()
    
    input_path = Path(args.input)
    output_path = Path(args.output) if args.output else input_path.with_name(input_path.stem + '_solved.json')
    solver_dir = Path(__file__).parent.absolute()
    
    if not input_path.exists():
        print(f"Error: Input file not found: {input_path}", file=sys.stderr)
        sys.exit(1)
    
    solve_json_file(str(input_path), str(output_path), str(solver_dir), args.force)


if __name__ == '__main__':
    main()
