"""Bundle the verified Vite build into one offline HTML file; no third-party service."""
from pathlib import Path
import re, hashlib, base64
root=Path(__file__).resolve().parent.parent
html=(root/'dist/index.html').read_text()
html=re.sub(r'<meta[^>]+http-equiv="Content-Security-Policy"[^>]*>', '', html)
html=re.sub(r'(?m)^[ \t]+$', '', html)
# A downloaded single-file page must not depend on sibling icon or manifest files.
html=re.sub(r'<link rel="manifest"[^>]*>', '', html)
def icon(match):
    path=root/'dist'/match[2].lstrip('./')
    mime='image/svg+xml' if path.suffix=='.svg' else 'image/png' if path.suffix=='.png' else 'image/x-icon'
    return match[1]+'data:'+mime+';base64,'+base64.b64encode(path.read_bytes()).decode()+match[3]
html=re.sub(r'(<link rel="(?:icon|apple-touch-icon)" href=")([^"]+)("[^>]*>)',icon,html)
script_hashes=[]
def script(match):
    code=(root/'dist'/match[1].lstrip('/')).read_text().replace('</script','<\\/script')
    script_hashes.append(base64.b64encode(hashlib.sha256(code.encode()).digest()).decode())
    return '<script type="module">'+code+'</script>'
html=re.sub(r'<script type="module" crossorigin src="([^"]+)"></script>',script,html)
def style(match):
    return '<style>'+(root/'dist'/match[1].lstrip('/')).read_text()+'</style>'
html=re.sub(r'<link rel="stylesheet" crossorigin href="([^"]+)">',style,html)
policy="default-src 'none'; script-src "+' '.join("'sha256-"+h+"'" for h in script_hashes)+"; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'"
html=html.replace('<head>','<head><meta http-equiv="Content-Security-Policy" content="'+policy+'">',1)
out=root/'release';out.mkdir(exist_ok=True)
(out/'chagok.html').write_text(html)
(root/'chagok.html').write_text(html)
print('Created release/chagok.html')
