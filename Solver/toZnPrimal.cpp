#include <bits/stdc++.h>
using namespace std;


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

  vector<vector<int>> inversions;
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
        inversions.emplace_back(move(inv));
      }
    }
  }
  /*
  for(int k=0; k<inversions.size(); k++) {
    for (int l=0; l<n*m; l++) {
      cout<<inversions[k][l];
    }
    cout<<endl;
  }
  cout<<endl;

  for(int k=0; k<target.size(); k++) {
    cout<<target[k];
  }
  cout<<endl;
  */

  // Outputting a MiniZinc .dzn file
  cout << "W = 1.." << target.size() << ";\n";
  cout << "H = 1.." << inversions.size() << ";\n";

  cout << "a = \n[";
  for (int l = 0; l<target.size() ; l++) {
    cout << "| ";
    for (int k = 0; k<inversions.size() ; k++) {
      cout << inversions[k][l];
      cout << ", ";
    }
    cout << endl;
  }
  cout << "|];\n";

  cout << "target = [";
  for(int l = 0; l<target.size(); l++) {
    cout << target[l] << ", ";
  }
  cout << "];\n";
}

