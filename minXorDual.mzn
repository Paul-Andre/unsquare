set of int: W;
set of int: H;
array[W,H] of 0..1: a;
array[W] of 0..1: target;
int : at_most;

array[H] of var 0..1: v;

array[W] of var 0..1: result;
    
constraint forall(i in W)( result[i] = (sum(j in H)(v[j]*a[i,j]) + target[i]) mod 2);

var int: s = sum(i in W) (result[i]);

%constraint s <= at_most;

%array[H] of 0..1: warm = [0 | i in H];

solve
%:: warm_start( v, warm)
minimize s;

output [show(result) ++ "; " ++ show(s)]