So far, the commands to use the MiniZinc solvers look like:

```
g++ -Wall -pedantic -std=c++17 toZnDual.cpp && ./a.out < input11.txt > dual.dzn

time minizinc minXorDual.mzn dual.dzn -a --solver highs
```



Or use `--solver or-tools -p8` or something (or-tools needs to be separately
installed)


So far running highs on the dual seems to work the best. And it actually
tends to terminate, imagine that!


Actually, now all we need is to run solve_levels.py, and it automatically solves levels, and quite fast at that!
