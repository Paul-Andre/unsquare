#!/usr/bin/env python3
# This script was written mostly by cursor
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

import json
import subprocess
import sys
import os
import tempfile
import re
import time
from pathlib import Path


def tiles_to_binary_string(tiles):
    """
    Convert tiles array (1=white, 2=black) to binary string for toZnDual.cpp.
    Target: 1 (black) should be flipped to 0 (white), so 2->'1', 1->'0'
    """
    rows = []
    for row in tiles:
        row_str = ''.join('1' if cell == 2 else '0' for cell in row)
        rows.append(row_str)
    return rows


def create_input_file(binary_rows):
    """Create a temporary input file for toZnDual.cpp"""
    m = len(binary_rows)
    n = len(binary_rows[0]) if binary_rows else 0
    
    fd, path = tempfile.mkstemp(suffix='.txt', text=True)
    with os.fdopen(fd, 'w') as f:
        f.write(f"{m} {n}\n")
        for row in binary_rows:
            f.write(row + "\n")
    return path


def compile_and_run_toZnDual(input_file, solver_dir):
    """Compile toZnDual.cpp (if needed) and run it with the input file"""
    cpp_file = os.path.join(solver_dir, 'toZnDual.cpp')
    exe_file = os.path.join(solver_dir, 'toZnDual')
    
    # Only compile if executable doesn't exist or source is newer
    need_compile = False
    if not os.path.exists(exe_file):
        need_compile = True
    elif os.path.exists(cpp_file):
        cpp_mtime = os.path.getmtime(cpp_file)
        exe_mtime = os.path.getmtime(exe_file)
        if cpp_mtime > exe_mtime:
            need_compile = True
    
    if need_compile:
        print(f"    Compiling toZnDual.cpp...", end=' ', flush=True)
        compile_cmd = ['g++', '-Wall', '-pedantic', '-std=c++17', '-O3', '-o', exe_file, cpp_file]
        compile_result = subprocess.run(compile_cmd, capture_output=True, text=True)
        if compile_result.returncode != 0:
            print(f"✗ FAILED")
            print(f"Compilation error: {compile_result.stderr}", file=sys.stderr)
            return None, None
        print(f"✓ Done")
    
    # Run - capture both stdout (dzn data) and stderr (initial solution)
    with open(input_file, 'r') as f:
        run_result = subprocess.run([exe_file], stdin=f, capture_output=True, text=True)
    
    if run_result.returncode != 0:
        print(f"toZnDual error: {run_result.stderr}", file=sys.stderr)
        return None, None
    
    return run_result.stdout, run_result.stderr


def create_minizinc_dzn(dzn_data, solver_dir):
    """Create a temporary .dzn file for MiniZinc"""
    fd, path = tempfile.mkstemp(suffix='.dzn', dir=solver_dir, text=True)
    with os.fdopen(fd, 'w') as f:
        f.write(dzn_data)
    return path




def solve_with_minizinc(dzn_file, model_file, solver_dir):
    """Run MiniZinc solver as in solver.md: minizinc model.mzn data.dzn -a --solver highs"""
    # Use -a flag to get all solutions (though we typically only need one)
    cmd = ['minizinc', model_file, dzn_file, '-a', '--solver', 'highs']
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        if result.returncode != 0:
            print(f"MiniZinc error: {result.stderr}", file=sys.stderr)
            return None
        return result.stdout
    except subprocess.TimeoutExpired:
        print("MiniZinc timeout", file=sys.stderr)
        return None


def parse_minizinc_output(output):
    """
    Parse MiniZinc output to extract the FINAL result vector (solution).
    With -a, MiniZinc may print multiple solutions; we should select the last one.
    Expected line format: [result1, result2, ..., resultw]; score
    """
    if not output or 'unsolvable' in output.lower():
        return None

    # Collect all solution vectors; choose the last one
    matches = re.findall(r'\[([\d,\s]+)\];\s*\d+', output)
    if not matches:
        return None

    result_str = matches[-1]
    result = [int(x.strip()) for x in result_str.split(',') if x.strip()]
    return result


def generate_operations(m, n):
    """
    Generate all possible square operations for an m×n grid.
    Exactly matches JavaScript compute_operations in algo.js lines 9-30.
    JavaScript uses: w = width (cols), h = height (rows), arr[x + y*w] where x=col, y=row
    This gives row-major: arr[col + row*n] matching Grid indexing.
    """
    operations = []
    # In JavaScript: w = geometry.width (number of cols = n), h = geometry.height (number of rows = m)
    w = n  # width = number of columns
    h = m  # height = number of rows
    
    for i in range(w):  # i from 0 to w-1 (columns)
        for j in range(h):  # j from 0 to h-1 (rows)
            for s in range(2, min(w - i, h - j) + 1):  # s from 2 to min(w-i, h-j)
                # JavaScript: arr[x + y*w] where x=i+ii (col), y=j+jj (row), w=n
                # This gives: arr[col + row*n] (row-major, matching Grid)
                arr = [0] * (w * h)
                for ii in range(s):
                    for jj in range(s):
                        x = i + ii  # column
                        y = j + jj  # row
                        idx = x + y * w  # idx = col + row*n (row-major)
                        arr[idx] = 1
                # Store as list of indices where arr[idx] == 1
                op_cells = [idx for idx, val in enumerate(arr) if val == 1]
                operations.append(op_cells)
    
    return operations


def verify_solution(tiles, solution_vector):
    """
    Verify that a solution vector actually solves the puzzle.
    Stops the script with an assertion error if verification fails.
    
    Args:
        tiles: 2D array of tiles (1=white, 2=black)
        solution_vector: List of 0s and 1s indicating which operations to apply
    """
    m = len(tiles)
    n = len(tiles[0]) if tiles else 0
    
    num_ops = sum(solution_vector)
    
    # Convert tiles to vector exactly as JavaScript: level.tiles.array with each element decremented by 1
    # Grid uses: array[width * y + x] where x=col, y=row, width=n (cols), height=m (rows)
    # So array index = n * row + col (row-major)
    # JavaScript: tilesVector[i] = tiles.array[i] - 1
    # For mod 2: 1 (white) -> 0, 2 (black) -> 1
    
    # Build grid array in same order as GridFromArray
    grid = []
    for row in range(m):  # y from 0 to m-1 (rows)
        for col in range(n):  # x from 0 to n-1 (cols)
            cell_value = tiles[row][col]
            # array[n * y + x] = array[n * row + col]
            idx = n * row + col
            # 2 (black) -> 1, 1 (white) -> 0 (after decrement by 1: 2->1, 1->0)
            grid.append(1 if cell_value == 2 else 0)
    
    # Generate all operations (uses column-major: arr[x + y*w] where w=m, x=row, y=col)
    operations = generate_operations(m, n)
    
    assert len(solution_vector) == len(operations), \
        f"Solution vector length ({len(solution_vector)}) doesn't match operations count ({len(operations)})"
    
    # Apply operations where solution_vector[i] == 1
    # Operations are now stored with Grid (row-major) indices: idx = col + row*n
    result_grid = grid.copy()
    for i, use_op in enumerate(solution_vector):
        if use_op == 1:
            # Apply operation i (operations already use Grid row-major indices)
            for cell_idx in operations[i]:
                assert cell_idx < len(result_grid), f"Operation {i} references invalid cell index {cell_idx}"
                result_grid[cell_idx] = (result_grid[cell_idx] + 1) % 2
    
    # Check if result is all zeros (all white)
    black_count = sum(result_grid)
    assert all(cell == 0 for cell in result_grid), \
        f"Solution invalid: {black_count} cells still black (should be all white)"






def solve_level(level, solver_dir, force=False):
    """Solve a single level"""
    level_id = level.get('id', 'unknown')
    m = len(level.get('tiles', []))
    n = len(level.get('tiles', [{}])[0]) if level.get('tiles') else 0
    
    print(f"  Level: {level_id}, Grid: {m}×{n}")
    
    if level.get('colorScheme') != 'BW':
        print(f"    Skipping: Not a BW level")
        return None, "Not a BW level", False
    
    if level.get('tileShape') != 'square':
        print(f"    Skipping: Not a square tile shape")
        return None, "Not a square tile shape", False
    
    tiles = level.get('tiles')
    if not tiles:
        print(f"    Skipping: No tiles")
        return None, "No tiles", False
    
    # Skip if already solved with minizinc and force is not set
    if not force and level.get('solutionType') == 'minizinc':
        print(f"    Skipping: Already solved (minizinc)")
        return None, "Already solved (minizinc)", False
    
    # If there's already a solution, verify it first to test the sanity check
    existing_solution = level.get('solutionVector')
    existing_ops = sum(existing_solution) if existing_solution else None
    if existing_solution:
        print(f"    Verifying existing solution ({existing_ops} operations)...", end=' ', flush=True)
        try:
            verify_solution(tiles, existing_solution)
            print("✓ PASSED")
        except AssertionError as e:
            print("✗ FAILED")
            # This should never happen if the sanity check is correct and the solution is valid
            raise AssertionError(f"Existing solution in level {level_id} failed verification: {e}") from e
    
    # Convert tiles to binary
    print(f"    Converting tiles to binary format...")
    binary_rows = tiles_to_binary_string(tiles)
    
    # Create input file
    input_file = create_input_file(binary_rows)
    try:
        # Run toZnDual.cpp
        print(f"    Running toZnDual.cpp...")
        dzn_data, stderr_output = compile_and_run_toZnDual(input_file, solver_dir)
        if not dzn_data:
            print(f"    ✗ toZnDual failed")
            return None, "toZnDual failed", False
        
        if 'unsolvable' in dzn_data:
            print(f"    ✗ Puzzle is unsolvable")
            return None, "Unsolvable", False
        
        # Extract dimensions from dzn output for info
        w_match = re.search(r'W = 1\.\.(\d+)', dzn_data)
        h_match = re.search(r'H = 1\.\.(\d+)', dzn_data)
        if w_match and h_match:
            w = int(w_match.group(1))
            h = int(h_match.group(1))
            print(f"    Generated .dzn data: W={w}, H={h}")
        
        # Create .dzn file
        dzn_file = create_minizinc_dzn(dzn_data, solver_dir)
        print(f"    Created temporary .dzn file: {os.path.basename(dzn_file)}")
        
        # Use the original minizinc model
        model_file = os.path.join(solver_dir, 'minXorDual.mzn')
        
        try:
            # Solve with MiniZinc
            print(f"    Running MiniZinc solver...", end=' ', flush=True)
            solution_output = solve_with_minizinc(dzn_file, model_file, solver_dir)
            
            if not solution_output:
                print(f"✗ FAILED")
                return None, "MiniZinc solve failed", False
            
            # Print raw MiniZinc output
            print("\n    MiniZinc output:")
            print(solution_output.strip())
            print()

            # Parse minizinc output - it's already the correct solution vector
            solution_vector = parse_minizinc_output(solution_output)
            if solution_vector is None:
                print(f"✗ FAILED to parse")
                return None, "Failed to parse minizinc solution", False
            
            num_ops = sum(solution_vector)
            print(f"✓ Found solution with {num_ops} operations")
            
            # Compare with existing solution if present
            if existing_ops is not None:
                print(f"    Previous solution had {existing_ops} operations")
                assert num_ops <= existing_ops, \
                    f"New solution ({num_ops} ops) is WORSE than existing ({existing_ops} ops)!"
                if num_ops < existing_ops:
                    improvement = existing_ops - num_ops
                    print(f"    ✨ IMPROVED by {improvement} operation(s)!")
                    improved = True
                else:
                    print(f"    Same number of operations as before")
                    improved = False
            else:
                improved = False
            
            # Verify the solution (asserts on failure, stopping the script)
            print(f"    Verifying solution...", end=' ', flush=True)
            verify_solution(tiles, solution_vector)
            print(f"✓ PASSED")
            
            return solution_vector, "Solved", improved
            
        finally:
            os.unlink(dzn_file)
    finally:
        os.unlink(input_file)


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
    improved_levels = []  # Store (level, old_ops, new_ops, index) tuples
    
    print(f"\nProcessing {len(levels)} level(s)...\n")
    for i, level in enumerate(levels):
        print(f"[{i+1}/{len(levels)}]", end=' ')
        
        # Store old solution count before solving
        old_solution = level.get('solutionVector')
        old_ops = sum(old_solution) if old_solution else None
        
        # Measure solving time
        start_time = time.perf_counter()
        result = solve_level(level, solver_dir, force)
        elapsed_time = time.perf_counter() - start_time
        
        # Display elapsed time in milliseconds
        time_ms = elapsed_time * 1000
        print(f"    Time: {time_ms:.1f}ms")
        
        if len(result) == 3:
            solution_vector, status, improved = result
        else:
            # Handle old return format (backward compatibility)
            solution_vector, status = result
            improved = False
        
        if solution_vector:
            level['solutionVector'] = solution_vector
            level['solutionType'] = 'minizinc'
            solved_count += 1
            if improved:
                new_ops = sum(solution_vector)
                improved_levels.append((level, old_ops, new_ops, i))
        else:
            skipped_count += 1
            print(f"    Result: ✗ {status}")
        print()  # blank line between levels
    
    # Write output
    if book_data:
        output_data = book_data
        output_data['levels'] = levels
    else:
        output_data = levels
    
    with open(output_path, 'w') as f:
        json.dump(output_data, f, separators=(',', ':'))
    
    print(f"\nSummary: {solved_count} solved, {skipped_count} skipped")
    
    if improved_levels:
        print(f"\n✨ {len(improved_levels)} level(s) with improved solutions:")
        
        # Extract just the levels for the output file
        improved_levels_only = [level for level, _, _, _ in improved_levels]
        if book_data:
            improved_data = book_data.copy()
            improved_data['levels'] = improved_levels_only
        else:
            improved_data = improved_levels_only
        
        for level, old_ops, new_ops, index in improved_levels:
            level_id = level.get('id', 'unknown')
            improvement = old_ops - new_ops
            print(f"   - Level {index+1} ({level_id}): {old_ops} → {new_ops} operations (saved {improvement})")
    
    print(f"Output written to: {output_path}")


def main():
    if len(sys.argv) < 2:
        print("Usage: python solve_levels.py <input.json> [output.json] [--force]")
        sys.exit(1)
    
    # Parse --force flag
    force = '--force' in sys.argv
    
    # Filter out --force from arguments when parsing paths
    args = [arg for arg in sys.argv[1:] if arg != '--force']
    
    if len(args) < 1:
        print("Usage: python solve_levels.py <input.json> [output.json] [--force]")
        sys.exit(1)
    
    input_path = args[0]
    output_path = args[1] if len(args) > 1 else input_path.replace('.json', '_solved.json')
    
    # Get solver directory (where this script is located)
    solver_dir = os.path.dirname(os.path.abspath(__file__))
    
    if not os.path.exists(input_path):
        print(f"Error: Input file not found: {input_path}")
        sys.exit(1)
    
    solve_json_file(input_path, output_path, solver_dir, force)


if __name__ == '__main__':
    main()

