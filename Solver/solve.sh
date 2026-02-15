#!/bin/bash

INPUT_FILE="${1:-input5.txt}"

echo "$INPUT_FILE" && python3 pretty.py <"$INPUT_FILE" && g++ -O3 toZnDual.cpp -o toZnDual && time (./toZnDual < "$INPUT_FILE" > dual.dzn && time minizinc minXorDual.mzn dual.dzn -a --solver highs)  && python3 pretty.py <"$INPUT_FILE" && echo "$INPUT_FILE" && (paplay /usr/share/sounds/freedesktop/stereo/complete.oga &)

