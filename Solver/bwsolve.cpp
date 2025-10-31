#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
typedef unsigned long long ull;

int main() {
  int n,m;
  cin>>n>>m;
  char c = 's';
  //cin >>c;

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
            //cout << "  "<<x<<" " << y<<endl;
          }
        }

        //cout <<i<<" " << j<<" " << s <<endl; 

        cout<<(bitset<64>(inv))<<endl;

        inversions.push_back(inv);
      }
    }
  }

  if (c == 's') {
    ll repr=0;
    for (int i=0; i<n; i++) {
      string s;
      cin>>s;
      assert(s.size() == m);
      repr<<=m;
      for(int j=0; j<m; j++) {
        if (s[j]=='1'){
          repr|=(1<<(m-1-j));
        }
      }
    }


    int turns = 0;
    queue<ll> q;
    unordered_map<ll,ll> prev;
    q.push(repr);
    prev[repr]=repr;
    bool success = false;
    while(q.size() != 0){
      auto size = q.size();
      cerr << "turn " << turns<<endl;
      for(int i=0; i<size; i++) {
        ll v = q.front();
        q.pop();
        //cerr << v <<" " << vis.size() <<endl;
        if (v == 0) {
          success = true;
          goto finish;
        }
        for (ll inv : inversions){
          if (!(v&inv)) continue;
          ll u = v^inv;
          if(prev.count(u) == 0){
            q.push(u);
            prev[u]=v;
          }
        }
      }
      turns++;
    }

  finish:
    if (success) {
      cout << "Success at turn " << turns<<endl;
      ll v = 0;
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
  } else {
    int t,s;
    cin>>t>>s;
    ll repr = 0;
    srand(s);
    for(int i=0; i<t ;i++) {
      repr^=inversions[rand()%inversions.size()];
        for (int i=0; i<n; i++) {
          for (int j=0; j<m; j++) {
            cout<<(1&(repr>>((n-1-i)*m + (m-1-j))));
          }
          cout<<endl;
        }
          cout<<endl;
    }

  }
}




