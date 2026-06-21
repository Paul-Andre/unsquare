#/usr/bin/env python3
"""
Solver script for Unflip levels, given a book of levels.
Uses the "DFS" (it's not just DFS, it has a bit more intelligence to it) algorithm,
that gives the exhaustive list of all the best solutions.
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
import traceback

# Constants
DFS_TIMEOUT = 300
CPP_SOURCE = 'dfs.cpp'
CPP_EXECUTABLE = 'dfs'


@dataclass
class SolveResult:
    """Result of solving a level"""
    solutions: list[list] | None
    status: str
    improved: bool = False


def tiles_to_binary_string(tiles):
    """Convert tiles array (1=white, 2=black) to binary string for toZnDual.cpp."""
    return [''.join('1' if cell == 2 else '0' for cell in row) for row in tiles]


def compile_and_run_toZnDual(input_file, solver_dir, cli_args=None):
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
    
    # Run with 5 minute timeout
    with open(input_file, 'r') as f:
        cmd = [str(exe_file)]
        if cli_args:
            cmd.extend(cli_args)
        try:
            run_result = subprocess.run(cmd, stdin=f, capture_output=True, text=True, timeout=DFS_TIMEOUT)
        except subprocess.TimeoutExpired:
            print(f"dfs.cpp timeout (exceeded {DFS_TIMEOUT} seconds)", file=sys.stderr)
            return None, "timeout"
    
    if run_result.returncode != 0:
        print(f"toZnDual error: {run_result.stderr}", file=sys.stderr)
        return None, None
    
    return run_result.stdout, run_result.stderr




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
    if not force and level.get('solutionType') == 'exhaustive':
        return False, "Already solved (exhaustive)"
    return True, None

def level_get_solutions(level):
    solutions = level.get("solutions");
    if solutions:
        return solutions;
    single_solution = level.get("solutionVector");
    if single_solution:
        return [single_solution]
    return []

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
    # Verify existing solution if present
    existing_solutions = level_get_solutions(level);
    print(f"There are {len(existing_solutions)} existing solutions.");
    existing_ops = sum(existing_solutions[0]) if existing_solutions else None
    for i, solution in enumerate(existing_solutions):
        print(f"    Verifying existing solution {i+1} ({sum(solution)} operations)...", end=' ', flush=True)
        try:
            verify_solution(tiles, solution)
            print("✓ PASSED")
        except AssertionError as e:
            print("✗ FAILED")
            print(f"WARNING: Existing solution in level {level_id} failed verification: {e}")
            traceback.print_exc();
            existing_ops = None
    
    # Convert tiles to binary and create input file
    print("    Converting tiles to binary format...")
    binary_rows = tiles_to_binary_string(tiles)
    
    
    # Create temporary input file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt') as input_file:
        input_path = Path(input_file.name)
        input_file.write(f"{m} {n}\n")
        input_file.writelines(row + "\n" for row in binary_rows)
        input_file.flush()
        # Run toZnDual.cpp
        print("    Running dfs.cpp...")
        cli_args = None
        if (level.get('solutionType') == 'optimal' or level.get('solutionType') == 'exhaustive') and existing_ops is not None:
            cli_args = [str(existing_ops)]
        data, stderr_output = compile_and_run_toZnDual(str(input_path), solver_dir, cli_args)

        # Handle timeout
        if stderr_output == "timeout":
            print("    ✗ Timeout exceeded")
            return SolveResult(None, "timeout", False)

        print("\n    dfs output:")
        print(data.strip())
        print()

        # data is multiple lines. split by lines (ignore blank lines)
        solutions = [[int(a) for a in line.strip()] for line in data.strip().split('\n') if line.strip()]
        if not solutions:
            print("    ✗ ERROR: No solutions found")
            return SolveResult(None, "No solutions found", False)

        print(f"Found {len(solutions)} solution(s).")
        print(solutions)
        for solution_vector in solutions:
            num_ops = sum(solution_vector)
            print(f"✓ Found solution with {num_ops} operations")

            # Verify the solution
            print("    Verifying solution...", end=' ', flush=True)
            try:
                verify_solution(tiles, solution_vector)
                print("✓ PASSED")
            except AssertionError as e:
                print("✗ FAILED")
                print(f"WARNING: new solution failed verification: {e}")
                traceback.print_exc();
                return SolveResult(None, "Solution verification failed", False)
        
        # Compare with existing solution
        improved = False
        if existing_ops is not None:
            print(f"    Previous solution had {existing_ops} operations")
            if( num_ops > existing_ops ):
                print(f"WARNING: new solution ({num_ops} ops) is WORSE than existing ({existing_ops} ops)!")
            if num_ops < existing_ops:
                print(f"    ✨ IMPROVED by {existing_ops - num_ops} operation(s)!")
                improved = True
            else:
                print("    Same number of operations as before")
        

        
        return SolveResult(solutions, "Solved", improved)
            


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
        
        if result.solutions:
            level['solutions'] = result.solutions
            level['solutionType'] = "exhaustive"
            solved_count += 1
            if result.improved:
                improved_levels.append((level, old_ops, sum(result.solutions[0]), i))
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
    global DFS_TIMEOUT

    parser = argparse.ArgumentParser(description='Solve Unflip levels using MiniZinc')
    parser.add_argument('input', help='Input JSON file containing levels')
    parser.add_argument('output', nargs='?', help='Output JSON file (default: input with _solved suffix)')
    parser.add_argument('--force', action='store_true', help='Force re-solving of already solved levels')
    parser.add_argument('--timeout', type=int, default=DFS_TIMEOUT, help='How long should the dfs run for each level')
    
    args = parser.parse_args()

    if args.timeout:
        DFS_TIMEOUT = args.timeout
    
    input_path = Path(args.input)
    output_path = Path(args.output) if args.output else input_path.with_name(input_path.stem + '_exhaustive.json')
    solver_dir = Path(__file__).parent.absolute()
    
    if not input_path.exists():
        print(f"Error: Input file not found: {input_path}", file=sys.stderr)
        sys.exit(1)
    
    solve_json_file(str(input_path), str(output_path), str(solver_dir), args.force)


if __name__ == '__main__':
    main()
