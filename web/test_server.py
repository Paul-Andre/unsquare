#!/usr/bin/env python
try:
    from http import server # Python 3
except ImportError:
    import SimpleHTTPServer as server # Python 2

class MyHTTPRequestHandler(server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_my_headers()
        server.SimpleHTTPRequestHandler.end_headers(self)

    def send_my_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")

import sys
import os
if __name__ == '__main__':
    port = 8000
    if len(sys.argv)>1:
        port = int(sys.argv[1]);
    # Start serving in /www directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    www_dir = os.path.join(script_dir, 'www')
    os.chdir(www_dir)
    
    server.test(HandlerClass=MyHTTPRequestHandler, port=port)
