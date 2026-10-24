"""Bundle the verified Vite build into one offline HTML file; no third-party service."""
from pathlib import Path
import re
root=Path(__file__).resolve().parent.parent
html=(root/'dist/index.html').read_text()
def script(match):
    code=(root/'dist'/match[1].lstrip('/')).read_text().replace('</script','<\\/script')
    return '<script type="module">'+code+'</script>'
html=re.sub(r'<script type="module" crossorigin src="([^"]+)"></script>',script,html)
def style(match):
    return '<style>'+(root/'dist'/match[1].lstrip('/')).read_text()+'</style>'
html=re.sub(r'<link rel="stylesheet" crossorigin href="([^"]+)">',style,html)
out=root/'release';out.mkdir(exist_ok=True)
(out/'chagok.html').write_text(html)
(root/'chagok.html').write_text(html)
print('Created release/chagok.html')
