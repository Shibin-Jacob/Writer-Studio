import os
import re

frontend_dir = "frontend"
html_files = [f for f in os.listdir(frontend_dir) if f.endswith('.html') and f != 'offline.html']

for file in html_files:
    filepath = os.path.join(frontend_dir, file)
    with open(filepath, "r") as f:
        content = f.read()

    # 1. Update <head>
    # Add/Update favicon
    if 'rel="icon"' in content:
        content = re.sub(r'<link[^>]*rel="icon"[^>]*>', '<link rel="icon" type="image/png" href="/img/logo-circle.png">', content)
    else:
        content = content.replace("</head>", '    <link rel="icon" type="image/png" href="/img/logo-circle.png">\n</head>')

    # Add manifest
    if "manifest.json" not in content:
        content = content.replace("</head>", '    <link rel="manifest" href="/manifest.json">\n</head>')
        
    # Add pwa.js
    if "pwa.js" not in content:
        content = content.replace("</body>", '    <script src="/js/pwa.js"></script>\n</body>')
        
    # 2. Update existing img logos
    content = content.replace("logo-transparent-squaricle-squaricle-squaricle.png", "logo-nopadding.png")
    
    # 3. Update text-based logos (the SVG + "Writer Studio")
    pattern = r'<svg[^>]*viewBox="0 0 24 24"[^>]*width="32"[^>]*>.*?</svg>\s*Writer Studio'
    replacement = '<img src="/img/logo-nopadding.png" alt="Writer Studio Logo" style="height: 32px; margin-right: 8px; vertical-align: middle;">\n            Writer Studio'
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    with open(filepath, "w") as f:
        f.write(content)

print("Done updating HTML files.")
