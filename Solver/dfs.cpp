#include <bits/stdc++.h>
using namespace std;

void printMat(const vector<vector<int>> &mat, ostream& out=cerr){
  for(int i=0; i<mat.size(); i++) {
    for(int j=0; j<mat[i].size(); j++){
      out<<mat[i][j];
    }
    out<<endl;
  }
}

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


bool isEmpty(const vector<int> &v){
  for(int a:v){
    if(a!=0) return false;
  }
  return true;
}

void print(const vector<int> &v){
  for(int a:v){
    cout<<a;
  }
  cout<<endl;
}

vector<vector<int>> moves;

vector<int> firstBitPosition;
vector<int> gap;

vector<int> runningSolution;

int moves_target;
bool found_solution = false;

void solve(vector<int> &state, int move_ptr, int moves_done) {
  if (moves_done > moves_target) return;
  int remainingOptions = moves.size() - move_ptr;
  int remainingTarget = moves_target-moves_done;
  if (remainingOptions < remainingTarget) return;
  if (move_ptr >= moves.size()) {
    if (isEmpty(state)) {
      print(runningSolution);
      moves_target = min(moves_target, sumVec(runningSolution));
      cout<<sumVec(runningSolution)<<endl;
      found_solution = true;
    }
    return;
  }
  if (gap[move_ptr]) {
    // Fixed move
    int fb = firstBitPosition[move_ptr];
    if (state[fb]) {
      runningSolution.push_back(1);
      state ^= moves[move_ptr];

      bool good = true;
      for (int i = 1; i<gap[move_ptr]; i++) {
        if (state[fb+i]) good = false;
      }
      if (good) solve(state, move_ptr+1, moves_done+1);

      state ^= moves[move_ptr];
      runningSolution.pop_back();
    } else {
      runningSolution.push_back(0);

      bool good = true;
      for (int i = 1; i<gap[move_ptr]; i++) {
        if (state[fb+i]) good = false;
      }
      if (good) solve(state, move_ptr+1, moves_done);

      runningSolution.pop_back();
    }
    return;
  }

    runningSolution.push_back(1);
    state ^= moves[move_ptr];
    solve(state, move_ptr+1, moves_done+1);
    state ^= moves[move_ptr];
    runningSolution.pop_back();

    runningSolution.push_back(0);
    solve(state, move_ptr+1, moves_done);
    runningSolution.pop_back();


}

int main() {
  int n,m;
  cin>>n>>m;
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

  vector<int> target(n*m);

  for(int i=0; i<n; i++) {
    for (int j=0; j<m; j++) {
      target[i*m+j] = grid[i][j];
    }
  }


  for(int i=0; i<n; i++) {
    for (int j=0; j<m; j++) {
      for (int s=2; i+s<=n && j+s<=m; s++) {
        vector<int> inv(n*m, 0);
        for (int ii=0; ii<s; ii++) {
          for (int jj=0; jj<s; jj++) {
            int x = i+ii;
            int y = j+jj;
            inv[x+m*y] = 1;
          }
        }
        moves.emplace_back(move(inv));
      }
    }
  }
  sort(moves.begin(),moves.end(), [](const vector<int> &a, const vector<int> &b) {
      for (int j=0; j<a.size(); j++) {
      if (a[j] != b[j]) return b[j] < a[j];
      }
      return false;
      });

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

  for (int i=0; i<moves.size(); i++) {
    print(moves[i]);
    cout<<firstBitPosition[i]<<" ";
    cout<<gap[i]<<endl;
  }

  vector<int> state = target;
  for (moves_target = 1; moves_target<20 && !found_solution; moves_target++) {
    cout<<"trying with "<<moves_target<<" moves."<<endl;
    solve(state, 0, 0);
  }
  /* moves_target = 200; */
  /* solve(state, 0, 0); */
}

