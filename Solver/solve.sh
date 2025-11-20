#!/bin/bash

INPUT_FILE="${1:-input5.txt}"

g++ -O3 toZnDual.cpp -o toZnDual && time (./toZnDual < "$INPUT_FILE" > dual.dzn && time minizinc minXorDual.mzn dual.dzn -a --solver highs); (paplay /usr/share/sounds/freedesktop/stereo/complete.oga &)

