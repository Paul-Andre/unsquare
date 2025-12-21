w,h = map(int,input().split())
print(w,h)
for _ in range(h):
    s = input().strip()
    print(" ".join({"0":".", "1":"#"}[c] for c in s))