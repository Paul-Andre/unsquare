#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
typedef unsigned long long ull;

ull toInt(const vector<int> &vec) {
  ull repr = 0;
  assert(vec.size()<=64);
  for(int i=0; i<vec.size(); i++){
    ull a=vec[i];
    assert(a==0 || a==1);
    repr|=a<<i;
  }
  return repr;
}
vector<int> toArray(ull repr, int s=64) {
  vector<int> vec;
  for(int i=0; i<s; i++){
    int a=1&(repr>>i);
    vec.push_back(a);
  }
  return vec;
}



void printMat(const vector<vector<int>> &mat){
  for(int i=0; i<mat.size(); i++) {
    for(int j=0; j<mat[i].size(); j++){
      cout<<mat[i][j];
    }
    cout<<endl;
  }
}

void printPuzzle(int m, int n, vector<int> puzzle){
  for(int i=0; i<m; i++) {
    for(int j=0; j<n; j++) {
      cout<<puzzle[i*n + j];
    }
    cout<<endl;
  }
}
void printPuzzle(int m, int n, ull puzzle){
  for(int i=0; i<m; i++) {
    for(int j=0; j<n; j++) {
      cout<<(1&(puzzle>>(i*n + j)));
    }
    cout<<endl;
  }
}

void operator^=(vector<int> &lhs, const vector<int> &rhs){
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


struct SatSolutionAndKernel{
  vector<int> solution;
  vector<vector<int>> kernel;
};


optional<SatSolutionAndKernel>
solve(vector<vector<int>> mat, vector<int> target, const vector<vector<int>> &inversions){
  // partial pivoting gaussian elimination mod 2
  int m = mat.size();
  int n = mat[0].size();
  assert(target.size() == m);
  int r = 0;
  int c = 0;
  while(r<m && c<n){
    int rr = -1;
    for (int i=r; i<m; i++) {
      if (mat[i][c]==1) {
        rr = i;
        break;
      }
    }
    if (rr == -1) {
      c++;
      continue;
    }
    for(int j=0; j<n; j++) {
      int tmp = mat[rr][j];
      mat[rr][j] = mat[r][j];
      mat[r][j] = tmp;
    }
    {
      int tmp = target[rr];
      target[rr] = target[r];
      target[r] = tmp;
    }

    for (int i=0; i<m; i++){
      if (i!=r && mat[i][c]) {
        for (int j=0; j<n; j++) {
          mat[i][j] ^= mat[r][j];
        }
        target[i] ^= target[r];
      }
    }
    r++;
    c++;
  }
  vector<int> solution(n,0);
  vector<int> c2r(n,-1);
  vector<int> r2c(m,-1);
  for(int i=0; i<m; i++){
    int cc = -1;
    for(int j=0; j<n; j++){
      if(mat[i][j]==1){
        cc = j;
        break;
      }
    }
    if (cc!=-1) {
      c2r[cc] = i;
      r2c[i] = cc;
    }
    if (cc==-1 && target[i]!=0){
      return nullopt;
    }
    solution[cc] = target[i];
  }

  vector<vector<int>> kernelBasis;
  for(int j=0; j<n; j++){
    if(c2r[j] == -1) {
      vector<int> repr(n,0);
      repr[j] = 1;
      for(int i=0; i<m; i++) {
        if(mat[i][j]==1){
          repr[r2c[i]] = 1;
        }
      }
      kernelBasis.push_back(repr);
    }
  }
  if(kernelBasis.size() == 0){
    cout<<"no kernel\n";
    //return solution;
  }
  for(const vector<int> &kernel: kernelBasis){
    vector<int> repr(m, 0);
    for(int i=0; i<n; i++) {
      if(kernel[i]){
        repr^=inversions[i];
      }
    }
    assert(sumVec(repr) == 0);
  }

  cout <<"kernelBasis: " << endl;
  printMat(kernelBasis);
  cout <<endl;

  cout<<solution.size()<<endl;
  vector<int> best = solution;
  //int best_val = sumVec(repr);
  for(int l=0; l<10000; l++) {
    vector<int> repr ;
    if(rand()%2){
      repr = best;
    }else{
      repr = solution;
    }
    for(int k=0; k<100; k++) {
      repr ^= kernelBasis[rand()%kernelBasis.size()];
      if(sumVec(repr) < sumVec(best)){
        best = repr;
      }
    }
  }
  SatSolutionAndKernel ret;
  ret.solution = best;
  ret.kernel = kernelBasis;

  return ret;
}


int main() {

  
  int m,n;
  cin>>m>>n;
  srand(time(nullptr));

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
  vector<vector<int>> mat(n*m, vector<int>(inversions.size()));
  int j=0;
  for (auto inv: inversions){
    for(int i=0; i<m*n; i++){
      mat[i][j] = inv[i];
    }
    j++;
  }


  vector<int> target;
  for (int i=0;i<m; i++){
    string s;
    cin>>s;
    assert(s.size()==n);
    for (char c: s){
      if(c=='1'){
        target.push_back(1);
      }else{
        target.push_back(0);
      }
    }
  }

  //printMat(mat);
  if(auto solution_ = solve(mat, target, inversions)){
    auto solution = solution_->solution;
    int sum = 0;
    for(int a:solution){
      sum+=a;
    }
    cout<<sum<<" moves\n";
    for(int a:solution){
      cout<<a;
    }
    cout<<endl;
    vector<int> repr = target;

    printPuzzle(m,n,repr);
    cout<<endl;
    for(int i=0; i<solution.size(); i++) {
      if ((solution)[i]) {
        repr^=inversions[i];
        printPuzzle(m,n,repr);
        cout<<endl;
      }
    }
  }else{
    cout<<"unsolvable"<<endl;
  }
}




