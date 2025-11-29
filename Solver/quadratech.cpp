#include <algorithm>
#include <bitset>
#include <iostream>
#include <string>
#include <sys/types.h>
#include <vector>

#ifndef N
#define N 9
#endif

int w,h;

using State = std::bitset<N * N>;

std::vector<State> moves;
std::vector<State> between_masks;
std::vector<uint> largest_bits;

void print(State state) {
	for (uint i = 0; i < w; i++) {
		for (uint j = 0; j < h; j++) {
			std::cout << (state[w * i + j]? 'O': '_');
		}
		std::cout << '\n';
	}
	std::cout << '\n';
}

std::vector<State> gen_moves() {
	std::vector<State> result;
	for (uint len = 2; len <= N; len++) {
		for (uint i = 0; i + len <= w; i++) {
			for (uint j = 0; j + len <= h; j++) {
				State move(0);
				for (uint di = 0; di < len; di++) {
					for (uint dj = 0; dj < len; dj++) {
						move.set(w * (i + di) + (j + dj));
					}
				}
				result.push_back(move);
			}
		}
	}
	return result;
}

std::vector<bool> solution;

bool solve(State state, uint move_ptr, uint moves_left) {
	if (move_ptr + moves_left > moves.size()) {
		return false;
	}
	if (moves_left == 0) {
    if (state.none()) {
      std::cout<<"Got solution\n";
      for (auto b: solution) {
        std::cout<<b;
      }
      std::cout<<std::endl;
      return true;
    }
    return false;
	}

	if (largest_bits[move_ptr] != largest_bits[move_ptr + 1]) {
		// Forced move
		if (state[largest_bits[move_ptr]]) {
			state ^= moves[move_ptr];
			if ((state & between_masks[move_ptr]).any()) {
				return false;
			}
      solution.push_back(1);
      bool sol = solve(state, move_ptr + 1, moves_left - 1);
      solution.pop_back();

      if (sol) {
        std::cout<<"Solved 1\n";
        print(moves[move_ptr]);
        //return true;
      }
      solution.push_back(1);
		}
		else {
			if ((state & between_masks[move_ptr]).any()) {
				return false;
			}
      solution.push_back(1);
			bool sol = solve(state, move_ptr + 1, moves_left);
      solution.pop_back();
			return sol;
		}
	}

  {
      solution.push_back(0);
	bool sol = solve(state, move_ptr + 1, moves_left);
      solution.pop_back();
    if (sol) {
		  //return true;
	  }
  }
  {
      solution.push_back(1);
	bool sol = solve(state ^ moves[move_ptr], move_ptr + 1, moves_left - 1);
      solution.pop_back();
	if (sol) {
    std::cout<<"Solved 2\n";
		print(moves[move_ptr]);
		//return true;
	}
  }
	return false;
}

int main(int argc, char* argv[]) {
	if (argc < 2) {
		std::cout << "USAGE: " << argv[0] << " n_moves\n";
		return 1;
	}
	uint n_moves = std::stoi(argv[1]);

  std::cin>>w>>h;

	State problem;
	moves = gen_moves();
	std::sort(moves.begin(), moves.end(), [](State a, State b) {
			return a.to_string() > b.to_string();
			});

	largest_bits.resize(moves.size() + 1);
	for (uint i = 0; i < moves.size(); i++) {
		for (int bit = N * N; bit >= 0; bit --) {
			if (moves[i][bit]) {
				largest_bits[i] = bit;
				break;
			}
		}
	}
	largest_bits[moves.size()] = 0;

	between_masks.resize(moves.size());
	for (uint i = 0; i < moves.size(); i++) {
		for (uint j = largest_bits[i + 1] + 1; j < largest_bits[i]; j++) {
			between_masks[i].set(j);
		}
	}

	std::string str;
	std::getline(std::cin, str);
	for (uint i = 0; i < w; i++) {
		std::getline(std::cin, str);
		for (uint j = 0; j < h; j++) {
			if (str[j] == '1') {
				problem.set(w * i + j);
			}
		}
	}
	if (!solve(problem, 0, n_moves)) {
		return 1;
	}
}
