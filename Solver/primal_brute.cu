#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
typedef unsigned long long ull;

#define NUM_THREADS (1ull<<10)

__host__ __device__
ull mul_xor(ull *inversions, int num_inv, ull seq) {
  ull result = 0;
  for (int j = 0; j<num_inv; j++) {
    if (seq & (1ull <<j)) {
      result ^= inversions[j];
    }
  }
  return result;
}

__global__ void compute(ull *inversions, int num_inv, ull target, ull evals_start, ull sub_evals_per_thread, ull *ret_val, ull *ret_seq) {

  ull tid = blockIdx.x * blockDim.x + threadIdx.x;

  __shared__ ull sh_best_val[NUM_THREADS];
  __shared__ ull sh_best_seq[NUM_THREADS];

  // TODO: potentially could only have seq
  ull best_val = 10000;
  ull best_seq = 0;

  if (evals_start != 0) {
    best_val = ret_val[blockIdx.x];
    best_seq = ret_seq[blockIdx.x];
  }

  for (ull i = 0; i<sub_evals_per_thread; i++) {
    ull seq = tid + evals_start*gridDim.x*blockDim.x + i*gridDim.x*blockDim.x;
    ull result = mul_xor(inversions, num_inv, seq);
    ull value = __popcll(seq);

    if (result == target) {
      if (value < best_val) {
        best_val = value;
        best_seq = seq;
      }
    }
  }

  sh_best_val[threadIdx.x] = best_val;
  sh_best_seq[threadIdx.x] = best_seq;

  __syncthreads();

  ull num_evaluated = blockDim.x;

  // Fold ("tree") -based minimum finding.
  for (ull fold = (num_evaluated>>1); fold >= 1; fold>>=1) {
    if (threadIdx.x < fold) {
      if (sh_best_val[threadIdx.x + fold] < sh_best_val[threadIdx.x]) {
        sh_best_val[threadIdx.x] = sh_best_val[threadIdx.x + fold];
        sh_best_seq[threadIdx.x] = sh_best_seq[threadIdx.x + fold];
      }
    }
    __syncthreads();
  }

  if (threadIdx.x == 0) {
    ret_val[blockIdx.x] = sh_best_val[0];
    ret_seq[blockIdx.x] = sh_best_seq[0];
  }

}

__global__ void reduce(ull *val, ull *seq, ull stride) {

  ull tid = blockIdx.x * blockDim.x + threadIdx.x;
  __shared__ ull sh_val[NUM_THREADS];
  __shared__ ull sh_seq[NUM_THREADS];

  for (ull i = 0; i<blockDim.x; i++) {
    sh_val[threadIdx.x] = val[tid*stride];
    sh_seq[threadIdx.x] = seq[tid*stride];
  }
  __syncthreads();

  ull num_evaluated = blockDim.x;

  // Fold ("tree") -based minimum finding.
  for (ull fold = (num_evaluated>>1); fold >= 1; fold>>=1) {
    if (threadIdx.x < fold) {
      if (sh_val[threadIdx.x + fold] < sh_val[threadIdx.x]) {
        sh_val[threadIdx.x] = sh_val[threadIdx.x + fold];
        sh_seq[threadIdx.x] = sh_seq[threadIdx.x + fold];
      }
    }
    __syncthreads();
  }

  if (threadIdx.x == 0) {
    val[tid*stride] = sh_val[0];
    seq[tid*stride] = sh_seq[0];
  }


}

int main() {
  // In this version, the grid will be represented as a single 64 bit number.

  // Read in the grid dimensions
  int n,m;
  cin>>n>>m;

  // Create the representation of the moves
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
        cout<<(bitset<64>(inv))<<endl;
        inversions.push_back(inv);
      }
    }
  }
  int num_inv = inversions.size();
  cout <<num_inv<<endl;

  // Read in the grid
  ull target=0;
  for (int i=0; i<n; i++) {
    string s;
    cin>>s;
    assert(s.size() == m);
    target<<=m;
    for(int j=0; j<m; j++) {
      if (s[j]=='1'){
        target|=(1<<(m-1-j));
      }
    }
  }

  ull num_blocks = (1ull << num_inv)/NUM_THREADS;
  if (num_blocks == 0) num_blocks = 1;

  ull evals_per_thread = 1;
  ull MAX_NUM_BLOCKS = (1ull <<10);
  if (num_blocks > MAX_NUM_BLOCKS) {
    evals_per_thread = num_blocks/MAX_NUM_BLOCKS;
    num_blocks = MAX_NUM_BLOCKS;
  }

  cout<< "evals_per_thread " <<evals_per_thread<<endl;
  cout<< "num_blocks " <<num_blocks<<endl;

  ull *ret_val, *ret_seq;
  ret_val = (ull *)calloc(sizeof(ull),num_blocks);
  ret_seq = (ull *)calloc(sizeof(ull),num_blocks);
  /* ret_val = (ull *)calloc(sizeof(ull),1); */
  /* ret_seq = (ull *)calloc(sizeof(ull),1); */

  ull *cu_inversions, *cu_ret_val, *cu_ret_seq;
  cudaMalloc((void**)&cu_inversions, sizeof(ull)*inversions.size());
  printf("%s\n", cudaGetErrorString(cudaGetLastError()));

  cudaMalloc((void**)&cu_ret_val, sizeof(ull)*num_blocks);
  printf("%s\n", cudaGetErrorString(cudaGetLastError()));
  cudaMalloc((void**)&cu_ret_seq, sizeof(ull)*num_blocks);
  printf("%s\n", cudaGetErrorString(cudaGetLastError()));

  cudaMemcpy(cu_inversions, &inversions[0], sizeof(ull)*inversions.size(), cudaMemcpyHostToDevice);

  ull num_threads = min(NUM_THREADS, (1ull << inversions.size()));


  ull sub_evals_per_thread = 1<<15;
  for (ull evals_start = 0; evals_start<evals_per_thread; evals_start+=sub_evals_per_thread) {
    compute<<< num_blocks, num_threads >>>(cu_inversions, inversions.size(), target, evals_start, sub_evals_per_thread, cu_ret_val, cu_ret_seq);
    cudaDeviceSynchronize();
    cout<<evals_start<<" "<<(double)evals_start/evals_per_thread<<endl;
  }
  cout << "Finished computing, now reducing" <<endl;


  if (false) {
    // Reducing on the CPU
    cout << "Reducing on the CPU" <<endl;
    cudaMemcpy(ret_seq, cu_ret_seq, sizeof(ull)*num_blocks, cudaMemcpyDeviceToHost);
    cudaMemcpy(ret_val, cu_ret_val, sizeof(ull)*num_blocks, cudaMemcpyDeviceToHost);
    ull best_seq = 0;
    ull best_val = 100000;
    for (int i =0; i<num_blocks; i++) {
      if (ret_val[i] < best_val) {
        best_val = ret_val[i];
        best_seq = ret_seq[i];
      }
    }
    cout<<best_val <<endl;
    cout<<(bitset<64>(best_seq))<<endl;
  }


  // Reducing on the GPU
  cout << "Reducing on the GPU" <<endl;
  ull size = num_blocks;
  ull stride = 1;
  while(size > 1) {
    ull num_threads = min(size, NUM_THREADS);
    ull num_blocks = size/num_threads;

    reduce<<< num_blocks, num_threads>>>(cu_ret_val, cu_ret_seq, stride);
    cudaDeviceSynchronize();
    cout << "Finished reducing with stride "<<stride <<" and size "<<size<<endl;

    stride*=num_threads;
    size/=num_threads;
  }

  cout << "Finished reducing, transfering result." <<endl;

  /* cudaMemcpy(ret_seq, cu_ret_seq, sizeof(ull)*num_blocks, cudaMemcpyDeviceToHost); */
  /* cudaMemcpy(ret_val, cu_ret_val, sizeof(ull)*num_blocks, cudaMemcpyDeviceToHost); */
  cudaMemcpy(ret_val, cu_ret_val, sizeof(ull)*1, cudaMemcpyDeviceToHost);
  cudaMemcpy(ret_seq, cu_ret_seq, sizeof(ull)*1, cudaMemcpyDeviceToHost);



  {
    ull best_seq = ret_seq[0];
    ull best_val = ret_val[0];
    cout<<best_val <<endl;
    cout<<(bitset<64>(best_seq))<<endl;
  }

  // Compute on CPU to compare
  if (false){

    ull best_seq = 0;
    ull best_val = 100000;

    for (ull i = 0; i<(1ull << num_inv); i++) {
      ull result = 0;
      ull value = 0;
      for (int j = 0; j<num_inv; j++) {
        if (i & (1ull <<j)) {
          result ^= inversions[j];
          value += 1;
        }
      }
      if (result == target) {
        if (value < best_val) {
          best_val = value;
          best_seq = i;
        }
      }
    }
    cout<<best_val <<endl;
    cout<<(bitset<64>(best_seq))<<endl;
  }

}





