"""Publish a prebuilt online site with the existing Git proxy, no extra hosting signup.
Only public browser configuration is embedded. Never uses a database/service-role key.
"""
import os, re, subprocess, tempfile, json, base64
from pathlib import Path
root=Path(__file__).resolve().parent.parent
os.chdir(root)
for key in ['VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY']:
    if not os.environ.get(key): raise SystemExit('Missing '+key)
key=os.environ['VITE_SUPABASE_PUBLISHABLE_KEY']
if key.startswith('sb_publishable_'):
    pass
elif key.count('.')==2:
    try:
        payload=key.split('.')[1]
        role=json.loads(base64.urlsafe_b64decode(payload+'='*(-len(payload)%4)))['role']
    except Exception:
        raise SystemExit('Invalid browser key format')
    if role!='anon': raise SystemExit('Use only a browser publishable/anon key')
else:
    raise SystemExit('Use only a browser publishable/anon key')
subprocess.run(['npm','run','build'],env={**os.environ,'VITE_ENABLE_CLOUD':'true'},check=True)
(root/'dist/.nojekyll').touch()
def git(*args,env=None,input=None):
    return subprocess.check_output(['git',*args],env=env,input=input).decode().strip()
remote=git('ls-remote','origin','refs/heads/gh-pages')
parent=None
if remote:
    parent=remote.split()[0]
    if not re.fullmatch('[0-9a-f]{40}',parent): raise SystemExit('Unexpected remote revision')
    git('fetch','origin','refs/heads/gh-pages')
with tempfile.TemporaryDirectory(prefix='chagok-pages-') as directory:
    env={**os.environ,'GIT_INDEX_FILE':str(Path(directory)/'index')}
    git('read-tree','--empty',env=env)
    for file in sorted((root/'dist').rglob('*')):
        if not file.is_file():continue
        relative=file.relative_to(root/'dist').as_posix()
        obj=git('hash-object','-w',str(file))
        git('update-index','--add','--cacheinfo',f'100644,{obj},{relative}',env=env)
    tree=git('write-tree',env=env)
    args=['commit-tree',tree]
    if parent:args+=['-p',parent]
    commit=git(*args,input=b'Publish online ministry journal\n')
    subprocess.run(['git','push','origin',commit+':refs/heads/gh-pages'],check=True)
    print('Static website pushed to gh-pages:',commit)
