#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
typedef unsigned long long ull;

void printMat(const vector<vector<int>> &mat){
  for(int i=0; i<mat.size(); i++) {
    for(int j=0; j<mat[i].size(); j++){
      cout<<mat[i][j];
    }
    cout<<endl;
  }
  cout <<endl;
}

void kernel(vector<vector<int>> &mat) {
  // full pivoting gaussian elimination mod 2
  int m = mat.size();
  int n = mat[0].size();
  int r = 0;
  int c = 0;
  while(r<m && c<n){
    int rr = -1;
    int cc = -1;
    for (int i=r; i<m; i++) {
      for (int j=c; j<n; j++) {
        if (mat[i][j]==1) {
          rr = i;
          cc = j;
          goto found;
        }
      }
    }
found:

    if (rr == -1) {
      c++;
      continue;
    }
    for(int i=0; i<m; i++) {
      int tmp = mat[i][cc];
      mat[i][cc] = mat[i][c];
      mat[i][c] = tmp;
    }
    for(int j=0; j<n; j++) {
      int tmp = mat[rr][j];
      mat[rr][j] = mat[r][j];
      mat[r][j] = tmp;
    }
    for (int i=0; i<m; i++){
      if (i!=r && mat[i][c]) {
        for (int j=0; j<n; j++) {
          mat[i][j] ^= mat[r][j];
        }
      }
    }
    r++;
    c++;
  }
}


int main() {

  {
  vector<vector<int>> mat = {{1, 0, 0}, {1, 0, 1}, {0, 0, 0}};
  kernel(mat);
  printMat(mat);
  }
  int n,m;
  cin>>n>>m;

  vector<ll> inversions;
  for (int i=0; i<n; i++) {
    for (int j=0; j<m; j++) {
      for (int s=2; i+s-1<n && j+s-1<m; s++) {

        ull inv = 0;
        for (int ii=0; ii<s; ii++){
          for (int jj=0; jj<s; jj++){
            int x = i+ii;
            int y = j+jj;
            inv|=(1ull<<(x*m+y)); 
          }
        }

        //cout<<(bitset<36>(inv))<<endl;

        inversions.push_back(inv);
      }
    }
  }
  vector<vector<int>> mat(m*n, vector<int>(inversions.size()));
  int j=-1;
  for (auto inv: inversions){
    j++;
    for(int i=0; i<n*m; i++){
      mat[i][j] = !!(inv&(1ull<<i));
    }
  }
  printMat(mat);
  kernel(mat);
  cout<<endl;
  printMat(mat);
}




