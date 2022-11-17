So far, the commands to use the MiniZinc solvers look like:

```
g++ -Wall -pedantic -std=c++17 toZnDual.cpp && ./a.out < input11.txt > dual11.dzn

time minizinc minXorDual.mzn dual11.dzn -a --solver coin-bc
```


Possibly replace dual by primal. 

Or use `--solver or-tools -p8` or something (or-tools needs to be separately
installed)


So far running coin-bc on the dual seems to work the best. And it actually
tends to terminate, imagine that!

