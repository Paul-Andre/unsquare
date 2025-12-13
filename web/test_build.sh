rm -rf dist && npm run build && (cd dist && python -m http.server 8001)
