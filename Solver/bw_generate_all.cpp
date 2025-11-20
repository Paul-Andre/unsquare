#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
typedef unsigned long long ull;

void printAsciiFromRepr(int n, int m, ull repr) {
  for (int i=0; i<n; i++) {
    for(int j=0; j<m; j++) {
      if (repr & (1ull<<(i*m+j))) {
        cout<<"#";
        cout<<" ";
      } else {
        cout<<".";
        cout<<" ";
      }
    }
    cout<<endl;
  }
}

ull transpose(int n, int m, ull repr) {
  assert(n==m);
  ull ret = 0;
  for (int i=0; i<n; i++) {
    for(int j=0; j<m; j++) {
      ret |= (!!(repr & (1ull<<(i*m+j))))<<(j*m+i);
    }
  }
  return ret;
}

ull flipVertAxis(int n, int m, ull repr) {
  ull ret = 0;
  for (int i=0; i<n; i++) {
    for(int j=0; j<m; j++) {
      ret |= (!!(repr & (1ull<<(i*m+j))))<<(i*m+(m-1-j));
    }
  }
  return ret;
}

ull rotateCw(int n, int m, ull repr) {
  assert(n==m);
  return flipVertAxis(n,m,transpose(n,m,repr));
}

ull id(int n, int m, ull repr) {
  return repr;
}

ull rotateTwice(int n, int m, ull repr) {
  // TODO: the assert is unnecessary, but need to change implementation.
  assert(n==m);
  return rotateCw(n,m,rotateCw(n,m,repr));
}

ull rotateCcw(int n, int m, ull repr) {
  assert(n==m);
  return rotateCw(n,m,rotateTwice(n,m,repr));
}

ull transposeRotateCw(int n, int m, ull repr) {
  assert(n==m);
  return rotateCw(n,m,transpose(n,m,repr));
}
ull transposeRotateTwice(int n, int m, ull repr) {
  assert(n==m);
  return rotateTwice(n,m,transpose(n,m,repr));
}
ull transposeRotateCcw(int n, int m, ull repr) {
  assert(n==m);
  return rotateCcw(n,m,transpose(n,m,repr));
}

typedef ull (*Symmetry)(int n, int m, ull repr);

Symmetry symmetry_functions[8] = {
  id,
  rotateCw,
  rotateTwice,
  rotateCcw,
  transpose,
  transposeRotateCw,
  transposeRotateTwice,
  transposeRotateCcw
};

bool hasSymmetry(int n, int m, ull repr) {
  for (int i=1; i<8; i++) {
    if (symmetry_functions[i](n,m,repr)==repr) {
      return true;
    }
  }
  return false;
}

void printNumsFromRepr(int n, int m, ull repr) {
  for (int i=0; i<n; i++) {
    for(int j=0; j<m; j++) {
      if (repr & (1ull<<(i*m+j))) {
        cout<<"1";
      } else {
        cout<<"0";
      }
    }
    cout<<endl;
  }
}

int main() {
  int n,m;
  //cin>>n>>m;
  n=5;
  m=5;

  vector<ull> inversions;
  for (int i=0; i<n; i++) {
    for (int j=0; j<m; j++) {
      for (int s=2; i+s-1<n && j+s-1<m; s++) {

        ull inv = 0;
        for (int ii=0; ii<s; ii++){
          for (int jj=0; jj<s; jj++){
            int x = i+ii;
            int y = j+jj;
            inv|=(1ull<<(x*m+y)); 
            //cout << "  "<<x<<" " << y<<endl;
          }
        }

        //cout <<i<<" " << j<<" " << s <<endl; 

        cout<<(bitset<64>(inv))<<endl;
        printAsciiFromRepr(n,m,inv);

        inversions.push_back(inv);
      }
    }
  }
  int turns = 0;
  queue<ull> q;
  unordered_map<ull,ull> prev;
  q.push(0);
  prev[0]=0;

  vector<ull> size_11_levels;

  while(q.size() != 0){
    auto size = q.size();
    cerr << "turn " << turns<< " there are "<<size<<" levels."<<endl;
    if (turns == 11) {
      queue<ull> copy = q;
      while(!copy.empty()) {
        size_11_levels.push_back(copy.front());
        copy.pop();
      }
    }

    ull v = q.front();
    printAsciiFromRepr(n,m,v);
    cout<<endl;
    printAsciiFromRepr(n,m,rotateCw(n,m,v));
    cout<<endl;
    printAsciiFromRepr(n,m,transpose(n,m,v));
    cout<<endl;
    printAsciiFromRepr(n,m,flipVertAxis(n,m,v));

    for(int i=0; i<size; i++) {
      ull v = q.front();
      q.pop();
      //cerr << v <<" " << vis.size() <<endl;
      //
      for (ull inv : inversions){
        //if (!(v&inv)) continue;
        ull u = v^inv;
        if(prev.count(u) == 0){
          q.push(u);
          for (int i=1; i<8; i++) {
            prev[symmetry_functions[i](n,m,u)] = u;
          }
          prev[u]=v;
        }
      }
    }
    turns++;
  }
  cout<<"total levels "<<prev.size()<<endl;

  for (int i=0; i<size_11_levels.size(); i++) {
    ull repr = size_11_levels[i];
    if (hasSymmetry(n,m,repr)) {
      printAsciiFromRepr(n,m,repr);
      cout<<endl;
    }
  }

finish:;
  /*
  if (success) {
    cout << "Success at turn " << turns<<endl;
    ull v = 0;
    while(v!=repr){
      v = prev[v];
      for (int i=0; i<n; i++) {
        for (int j=0; j<m; j++) {
          cout<<(1&(v>>((n-1-i)*m + (m-1-j))));
        }
        cout<<endl;
      }
      cout<<endl;
    }
  }else{
    cout << "Failure\n";
    cout << "Looked at " << prev.size() << " configurations.\n";
  }
  */
}




