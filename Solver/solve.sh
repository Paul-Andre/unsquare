#!/bin/bash

INPUT_FILE="${1:-input5.txt}"

g++ -O3 toZnDual.cpp -o toZnDual && python pretty.py <"$INPUT_FILE" && time (./toZnDual < "$INPUT_FILE" > dual.dzn && time minizinc minXorDual.mzn dual.dzn -a --solver highs)  && python pretty.py <"$INPUT_FILE" && echo "$INPUT_FILE" && (paplay /usr/share/sounds/freedesktop/stereo/complete.oga &)

