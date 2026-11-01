"""Build a self-contained offline preview from the modular app without dependencies."""
from pathlib import Path
import re,base64
root=Path(__file__).resolve().parent
cache={}
def data_url(name):
    if name in cache:return cache[name]
    src=(root/'src'/name).read_text(encoding='utf-8')
    def inline_import(match):
        target=match.group(1)
        if not target.startswith('./'):
            raise ValueError(target)
        return 'from "'+data_url(target[2:])+'"'
    src=re.sub(r"from ['\"](\./[^'\"]+)['\"]",inline_import,src)
    url='data:text/javascript;base64,'+base64.b64encode(src.encode('utf-8')).decode('ascii')
    cache[name]=url
    return url
html=(root/'index.html').read_text(encoding='utf-8')
css=(root/'src'/'styles.css').read_text(encoding='utf-8')
html=re.sub(r'<link rel="icon"[^>]*>', '', html)
html=re.sub(r'<link rel="stylesheet"[^>]*>', lambda m: '<style>\n'+css+'\n</style>', html)
html=re.sub(r'<script type="module" src="./src/app.js" defer></script>',lambda m: '<script type="module" src="'+data_url('app.js')+'"></script>', html)
output=root/'ORBIT_Offline_Preview.html'
output.write_text(html,encoding='utf-8')
print(output, len(html), 'bytes')
