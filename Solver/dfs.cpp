#include <bits/stdc++.h>
using namespace std;

int w,h;

#ifndef N
#define N 11
#endif

using State = std::bitset<N * N>;
//typedef vector<int> State;

void printPuzzle(int m, int n, vector<int> puzzle, ostream& out=cerr){
  for(int i=0; i<m; i++) {
    for(int j=0; j<n; j++) {
      out<<puzzle[i*n + j];
    }
    out<<endl;
  }
}

void operator^=(vector<int> &lhs, const vector<int> &rhs){
  assert(lhs.size() == rhs.size());
  for(int i=0; i<lhs.size() && i<rhs.size(); i++) {
    lhs[i]^=rhs[i];
  }
}


int sumVec(const vector<int> &v){
  int sum = 0;
  for(int a:v){
    sum+=a;
  }
  return sum;
}

int sumVec(const State &v){
  return v.count();
}



bool isEmpty(const State &v){
  return v.none();
}

void print(const vector<int> &v, ostream& out=cerr){
  for(int a:v){
    out<<a;
  }
  out<<endl;
}
void print(const State &v, ostream& out=cerr){
  out<<v<<endl;
}

vector<State> moves;
vector<State> notCovered;

vector<int> firstBitPosition;
vector<int> gap;

vector<int> runningSolution;

int moves_target;
bool found_solution = false;

vector<int> reorder;

void print_reordered(const vector<int> &v, ostream& out=cerr){
  for (int i=0; i<v.size(); i++) {
    out<<v[reorder[i]];
  }
  out<<endl;
}


void solve1(State &state, int move_ptr, int moves_done) {
  if (moves_done > moves_target) return;
  int remainingOptions = moves.size() - move_ptr;
  int remainingTarget = moves_target-moves_done;
  if (remainingOptions < remainingTarget) return;
  if (move_ptr >= moves.size()) {
    if (isEmpty(state)) {
      print_reordered(runningSolution, cout);
      moves_target = min(moves_target, sumVec(runningSolution));
      cerr<<sumVec(runningSolution)<<endl;
      found_solution = true;
    }
    return;
  }
  if (gap[move_ptr]) {
    // Fixed move
    int fb = firstBitPosition[move_ptr];
    if (state[fb]) {
      state ^= moves[move_ptr];

      /* bool good = true; */
      /* for (int i = 1; i<gap[move_ptr]; i++) { */
      /*   if (state[fb+i]) good = false; */
      /* } */

      bool good = (state & notCovered[move_ptr]) == 0;
      if (good) {
        runningSolution.push_back(1);
        solve1(state, move_ptr+1, moves_done+1);
        runningSolution.pop_back();
      }

      state ^= moves[move_ptr];
    } else {

      /* bool good = true; */
      /* for (int i = 1; i<gap[move_ptr]; i++) { */
      /*   if (state[fb+i]) good = false; */
      /* } */
      bool good = (state & notCovered[move_ptr]) == 0;
      if (good) {
        runningSolution.push_back(0);
        solve1(state, move_ptr+1, moves_done);
        runningSolution.pop_back();
      }


    }
    return;
  }

    runningSolution.push_back(1);
    state ^= moves[move_ptr];
    solve1(state, move_ptr+1, moves_done+1);
    state ^= moves[move_ptr];
    runningSolution.pop_back();

    runningSolution.push_back(0);
    solve1(state, move_ptr+1, moves_done);
    runningSolution.pop_back();


}

void solve2(State &state, int move_ptr, int moves_done) {
  if (moves_done > moves_target) return;
  int remainingOptions = moves.size() - move_ptr;
  int remainingTarget = moves_target-moves_done;
  if (remainingOptions < remainingTarget) return;
  if (move_ptr >= moves.size()) {
      print(runningSolution, cout);
      moves_target = min(moves_target, sumVec(runningSolution));
      cerr<<sumVec(runningSolution)<<endl;
      found_solution = true;
    return;
  }
  if (gap[move_ptr]) {
    state ^= moves[move_ptr];
    if ((state & notCovered[move_ptr]) == 0) {
      runningSolution.push_back(1);
      solve2(state, move_ptr+1, moves_done+1);
      runningSolution.pop_back();
    }
    state ^= moves[move_ptr];

    if ((state & notCovered[move_ptr]) == 0) {
      runningSolution.push_back(0);
      solve2(state, move_ptr+1, moves_done);
      runningSolution.pop_back();
    }
    return;
  }

    state ^= moves[move_ptr];
    runningSolution.push_back(1);
    solve2(state, move_ptr+1, moves_done+1);
    runningSolution.pop_back();
    state ^= moves[move_ptr];

    runningSolution.push_back(0);
    solve2(state, move_ptr+1, moves_done);
    runningSolution.pop_back();
}

int main() {
  int n,m;
  cin>>n>>m;
  assert (n*m <= N*N);
  vector<vector<int>> grid(n, vector<int>(m, 0));
  for (int i=0; i<n; i++) {
    string s;
    cin>>s;
    assert(s.size() == m);
    for (int j=0; j<m; j++) {
      char c = s[j];
      int cc = c-'0';
      grid[i][j] = cc;
    }
  }

  State target;

  for(int i=0; i<n; i++) {
    for (int j=0; j<m; j++) {
      target[i*m+j] = grid[i][j];
    }
  }

  vector<pair<State,int>> moves_i;

  int index = 0;
  for(int i=0; i<n; i++) {
    for (int j=0; j<m; j++) {
      for (int s=2; i+s<=n && j+s<=m; s++) {
        State inv;
        for (int ii=0; ii<s; ii++) {
          for (int jj=0; jj<s; jj++) {
            int x = i+ii;
            int y = j+jj;
            inv[x+m*y] = 1;
          }
        }
        moves_i.emplace_back(move(inv), index);
        index+=1;
      }
    }
  }
  sort(moves_i.begin(),moves_i.end(), [](const pair<State,int> &a, const pair<State,int> &b) {
      for (int j=0; j<a.first.size(); j++) {
      if (a.first[j] != b.first[j]) return b.first[j] < a.first[j];
      }
      return false;
      });

  reorder.resize(moves_i.size());
  for (int i=0; i<moves_i.size(); i++) {
    auto a = moves_i[i];
    moves.emplace_back(a.first);
    reorder[a.second] = i;
  }

  firstBitPosition = vector<int>(moves.size(), 0);
  gap = vector<int>(moves.size(), 0);
  for (int i=0; i<moves.size(); i++) {
    for (int j=0; j<moves[i].size(); j++) {
      if (moves[i][j]) {
        firstBitPosition[i] = j;
        break;
      }
    }
    if (i>=1) {
      gap[i-1] = firstBitPosition[i]-firstBitPosition[i-1];
    }
  }
  gap.back() = n*m - firstBitPosition.back();

  notCovered = vector<State>(moves.size(), 0);
  notCovered.back() = ~State(0);
  State covered(0);

  for (int i=moves.size()-1; i>=0; i--) {
    notCovered[i] = ~covered;
    covered |= moves[i];
  }


  for (int i=0; i<moves.size(); i++) {
    //print(moves[i]);
    //print(notCovered[i]);
    //cerr<<firstBitPosition[i]<<" ";
    //cerr<<gap[i]<<endl;
  }

  State state = target;
  for (moves_target = 1; moves_target<20 && !found_solution; moves_target++) {
    cerr<<"trying with "<<moves_target<<" moves."<<endl;
    solve1(state, 0, 0);
  }
  /* moves_target = 200; */
  /* solve(state, 0, 0); */
}

