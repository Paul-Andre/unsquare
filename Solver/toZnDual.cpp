#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
typedef unsigned long long ull;


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

struct SatSolutionAndKernel{
  vector<int> solution;
  vector<vector<int>> kernel;
};


// TODO: don't need both mat and inversions
optional<SatSolutionAndKernel> solve(vector<vector<int>> mat, vector<int> target, const vector<vector<int>> &inversions){
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
    // TODO: make sure this is correct, what was previously here would fail on
    // things with no kernel(?)
    if (cc==-1) { 
      if (target[i]!=0) {
        return nullopt;
      }
    } else {
      solution[cc] = target[i];
    }
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
  /*
  if(kernelBasis.size() == 0){
    cerr<<"no kernel\n";
    return solution;
  }
  */
  // sanity check. Vectors in kernel must project to zero
  for(const vector<int> &kernel: kernelBasis){
    vector<int> repr(m, 0);
    for(int i=0; i<n; i++) {
      if(kernel[i]){
        repr^=inversions[i];
      }
    }
    assert(sumVec(repr) == 0);
  }

  SatSolutionAndKernel ret;
  ret.solution = solution;
  ret.kernel = kernelBasis;

  return ret;
}

vector<int> randomlyImprove(const vector<int> &solution, const vector<vector<int>> &kernel) {

  vector<int> best = solution;
  //int best_val = sumVec(repr);
  for(int l=0; l<3000; l++) {
    vector<int> repr ;
    if(rand()%2){
      repr = best;
    }else{
      repr = solution;
    }
    for(int k=0; k<300; k++) {
      repr ^= kernel[rand()%kernel.size()];
      if(sumVec(repr) < sumVec(best)){
        best = repr;
      }
    }
  }
  return best;
}

vector<int> randomlyImproveAnnealing(const vector<int> &solution, const vector<vector<int>> &kernel) {

  vector<int> best = solution;
  //int best_val = sumVec(repr);
  for(int l=0; l<30; l++) {
    vector<int> repr ;
    if(rand()%2){
      repr = best;
    }else{
      repr = solution;
    }
    for(int k=0; k<30000; k++) {
      vector<int> newRepr = repr;
      newRepr ^= kernel[rand()%kernel.size()];

      if(sumVec(newRepr) < sumVec(best)){
        cerr << "===== Found "<<sumVec(newRepr)<<endl;
        best = newRepr;
      }
      int diff = sumVec(newRepr) - sumVec(repr);
      double T = 0.01;
      if(diff < 0 || ((double)rand()/RAND_MAX)< exp(-diff/T)){
        repr = newRepr;
        //cerr << "Found "<<sumVec(newRepr)<<endl;
      }
    }
  }
  return best;
}

vector<int> randomInKernel(const vector<vector<int>> &kernel) {
  vector<int> ret(kernel[0].size(), 0);
  for (int i=0; i<kernel.size(); i++) {
    if (!(rand()%10)) {
      ret ^= kernel[i];
    }
  }
  return ret;
}

vector<vector<int>> reorderKernelGreedy(vector<vector<int>> oldKernel) {
  if (oldKernel.size() == 0) {
    return oldKernel;
  }

  sort(oldKernel.begin(), oldKernel.end(), [](const vector<int> &a, const vector<int> &b) {
      return sumVec(a) > sumVec(b);
  });

  vector<vector<int>> newKernel;
  vector<int> carpet(oldKernel[0].size(), 0);

  while(oldKernel.size()) {
    int smallestHuh = 10000000;
    int bestI = 0;

    for (int i=0; i<oldKernel.size(); i++) {
      int huh = 0;
      for (int j=0; j<oldKernel[i].size(); j++) {
        if (carpet[j] || oldKernel[i][j]) {
          huh++;
        }
      }
      if (huh < smallestHuh) {
        smallestHuh = huh;
        bestI = i;
      }
    }
    cerr<<smallestHuh<<endl;
    newKernel.push_back(oldKernel[bestI]);
    for (int j=0; j<oldKernel[bestI].size(); j++) {
      if (carpet[j] || oldKernel[bestI][j]) {
        carpet[j] = true;
      }
    }
    for (int i=bestI+1; i<oldKernel.size(); i++) {
      oldKernel[i-1] = oldKernel[i];
    }
    oldKernel.pop_back();
  }
  reverse(newKernel.begin(), newKernel.end());

  return newKernel;
}

// Greedily make the kernel vectors shorter
vector<vector<int>> reduceKernelGreedy(vector<vector<int>> oldKernel) {
  if (oldKernel.size() == 0) {
    return oldKernel;
  }
  int n = oldKernel.size();
  int m = oldKernel[0].size();
  bool changed = true;
  while(changed) {
    changed = false;
    for (int i=0; i<n; i++) {
      for (int ii=0; ii<n; ii++) {
        if (i != ii) {
          vector<int> a = oldKernel[i];
          a^=oldKernel[ii];
          if (sumVec(a) < sumVec(oldKernel[i])) {
            oldKernel[i] = a;
            changed = true;
          }
        }
      }
    }
  }
  return oldKernel;
}

vector<vector<int>> reduceKernelGreedy2(vector<vector<int>> oldKernel) {
  if (oldKernel.size() == 0) {
    return oldKernel;
  }
  int n = oldKernel.size();
  int m = oldKernel[0].size();
  while(true) {
    bool changed = false;
    int bestI = 0;
    int bestIi = 0;
    int bestDiff = 0;
    for (int i=0; i<n; i++) {
      for (int ii=0; ii<n; ii++) {
        if (i != ii) {
          vector<int> a = oldKernel[i];
          a^=oldKernel[ii];
          int diff = sumVec(oldKernel[i]) - sumVec(a);
          if (diff > bestDiff) {
            bestDiff = diff;
            bestI = i;
            bestIi = ii;
            changed = true;
          }
        }
      }
    }
    if (changed) {
      int i = bestI;
      int ii = bestIi;
      vector<int> a = oldKernel[i];
      a^=oldKernel[ii];
      oldKernel[i] = a;
    } else {
      break;
    }
  }
  return oldKernel;
}


// Please reorder kernel first.
vector<int> branchAndBound(vector<int> best, const vector<vector<int>> &kernel) {

  int bestScore = sumVec(best);

  cerr << "Initial solution " << bestScore <<endl;

  int m = best.size();
  int n = kernel.size();


  vector<int> current = best;
  vector<int> overlapCounts(m, 0);
  for (int i=0; i<n; i++) {
    for (int j=0; j<m; j++) {
      if (kernel[i][j] != 0) {
        overlapCounts[j]++;
      }
    }
  }

  ull progress = 0;


  function<void(int)> rec = [&](int i) {
    if (i >= n) {
      int score = sumVec(current);
      if (score < bestScore) {
        best = current;
        bestScore = score;
        cerr << "Found solution " << bestScore <<endl;

        for(int a:best) {
          cerr<<a;
        }
        cerr<<endl;

      }
      return;
    }

    if (i == 8) {
      cerr << (double) progress * pow(0.5, 8) << endl;
      progress += 1;
    }



    int minPotential = 0;
    bool atLeastOneCanChange = false;

    for (int j=0; j<m; j++) {
      if (!overlapCounts[j]) {
        minPotential += current[j];
      } else if (current[j]) {
        atLeastOneCanChange = true;
      }
    }

    if (!atLeastOneCanChange) {
      int score = sumVec(current);
      if (score < bestScore) {
        best = current;
        bestScore = score;
        cerr << "Found (via atLeastOneCanChange) solution " << bestScore <<endl;

        for(int a:best) {
          cerr<<a;
        }
        cerr<<endl;

      }
      return;
    }

    // The +1 is because any added kernel vector will cover at least 1 location where current is zero
    if (minPotential + 1>= bestScore) {
      return;
    }

    for (int j=0; j<m; j++) {
      if (kernel[i][j] != 0) {
        overlapCounts[j]--;
      }
    }

    {
      rec(i+1);
      current ^= kernel[i];
      rec(i+1);
      current ^= kernel[i];
    }

    for (int j=0; j<m; j++) {
      if (kernel[i][j] != 0) {
        overlapCounts[j]++;
      }
    }

  };

  rec(0);

  return best;

}



void printKernel(const vector<vector<int>> &kernel) {
  int tot = 0;
    for (auto &k: kernel) {
      for(int a:k) {
        cerr<<a;
      }
      int s= sumVec(k);
      tot+=s;
      cerr << " " << s;
      cerr <<endl;
    }
    cerr << tot <<endl;
}

/*
void printSquareSequence(int m, int n, const vector<int> &solution, ostream& out=cerr) {
  vector<int> repr = ;
  cerr<<endl;
  for(int i=0; i<solution.size(); i++) {
    if ((solution)[i]) {
      repr^=inversions[i];
      printPuzzle(m,n,repr);
      out<<endl;
    }
  }
}
*/

optional<SatSolutionAndKernel>
solve2(vector<vector<int>> mat, vector<int> target, const vector<vector<int>> &inversions){
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
    cerr<<"no kernel\n";
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

  cerr <<"kernelBasis (dim "<<kernelBasis.size()<<"): " << endl;
  printMat(kernelBasis);
  cerr <<endl;

  cerr<<solution.size()<<endl;
  vector<int> best = solution;

  /* //int best_val = sumVec(repr); */
  /* for(int l=0; l<10000; l++) { */
  /*   vector<int> repr ; */
  /*   if(rand()%2){ */
  /*     repr = best; */
  /*   }else{ */
  /*     repr = solution; */
  /*   } */
  /*   for(int k=0; k<100; k++) { */
  /*     repr ^= kernelBasis[rand()%kernelBasis.size()]; */
  /*     if(sumVec(repr) < sumVec(best)){ */
  /*       best = repr; */
  /*     } */
  /*   } */
  /* } */
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
  vector<int> areas;

  /*
  for (int s=2; s<=m && s<=n; s++) {
  //for (int s=min(m, n); s>=2; s--) {
    for(int i=0; i<n; i++) {
      for (int j=0; j<m; j++) {
        if (i+s>n || j+s>m) {
          continue;
        }
        vector<int> inv(n*m, 0);
        for (int ii=0; ii<s; ii++) {
          for (int jj=0; jj<s; jj++) {
            int x = i+ii;
            int y = j+jj;
            inv[x+m*y] = 1;
          }
        }
        inversions.emplace_back(move(inv));
        areas.push_back(s*s);
      }
    }
  }
  */
  {
    auto &operations = inversions;

    int w = m;
    int h = n;
    for (int i=0; i<w; i++) {
      for (int j=0; j<h; j++) {
        for (int s=2; i+s<=w && j+s<=h; s++) {
          //let arr = new Array(w*h).fill(0);
          vector<int> arr(w*h, 0);
          for (int ii=0; ii<s; ii++) {
            for (int jj=0; jj<s; jj++) {
              int x = i+ii;
              int y = j+jj;
              arr[x + y*w] = 1;
            }
          }
          operations.push_back(arr);
        }
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
  /* for (int i=0;i<m; i++){ */
  /*   //string s; */
  /*   //cin>>s; */
  /*   //assert(s.size()==n); */
  /*   //for (char c: s){ */
  /*   for (int j=0; j<n; j++) { */
  /*     char c; */ 
  /*     cin>>c; */
  /*     if(c=='#'){ */
  /*       target.push_back(1); */
  /*     }else{ */
  /*       target.push_back(0); */
  /*     } */
  /*   } */
  /* } */
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

  if(auto solution_ = solve2(mat, target, inversions)){

    vector<vector<int>> kernel = solution_->kernel;
    vector<vector<int>> original_kernel = solution_->kernel;

    printKernel(kernel);

    cerr <<endl;
    cerr << "Kernel size " << kernel.size() <<endl;
    
    kernel = reduceKernelGreedy(kernel);
    cerr <<"simplified:"<< endl;
    printKernel(kernel);

    kernel = reorderKernelGreedy(kernel);
    cerr <<"reordered:"<< endl;
    printKernel(kernel);

    vector<int> solution = solution_->solution;
    vector<int> originalSolution = solution_->solution;
    vector<int> bestSolution = solution_->solution;
    cerr << "initial solution " << sumVec(solution) << endl;

    if (kernel.size()) {

      int doRandomlyImproveTimes = 0;
      while(doRandomlyImproveTimes--) {
        solution = randomlyImprove(originalSolution, original_kernel);
        cerr << "after randomly improving " << sumVec(solution) << endl;
        solution = randomlyImprove(solution, kernel);
        cerr << "after randomly improving " << sumVec(solution) << endl;

        solution = randomlyImproveAnnealing(solution, kernel);
        //solution = randomlyImprove(solution, kernel);
        cerr << "after randomly improving " << sumVec(solution) << endl;

        if (sumVec(solution) < sumVec(bestSolution)) {
          bestSolution = solution;
        }
      }

      /* solution = branchAndBound(solution, kernel); */
      /* cerr << "after branch and bound " << sumVec(solution) << endl; */


      for(int a:bestSolution) {
        cerr<<a;
    }
    cerr<<endl;

    }


    int W = bestSolution.size();
    int H = original_kernel.size();

    cout << "W = 1.." << W << ";\n";
    cout << "H = 1.." << H << ";\n";


    cout << "a = [|\n";
    for (int j=0; j<W; j++) {
      for (int i=0; i<H; i++) {
        /* cout << kernel[i][j] << ", "; */
        cout << original_kernel[i][j] << ", ";
      }
      if (j<W-1) {
        cout << "|\n";
      } else {
        cout << "|];\n";
      }
    }

    cout << "target = [";
    for (int i=0; i<bestSolution.size(); i++) {
      cout << bestSolution[i] << ", ";
    }
    cout << "];\n";

    /* cout << "costs = ["; */
    /* for (int i=0; i<areas.size(); i++) { */
    /*   cout << areas[i] << ", "; */
    /* } */
    /* cout << "];\n"; */

    int totCost = sumVec(bestSolution);

    cout << "at_most = " << totCost << ";\n";
  } else {
    cout << "unsolvable\n";

  }

}




