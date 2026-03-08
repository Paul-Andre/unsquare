rm -rf dist && npm run build && (cd dist && python3 -m http.server 8001)
