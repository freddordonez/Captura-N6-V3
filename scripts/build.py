#!/usr/bin/env python3
"""Ensambla src/* en www/index.html (un solo archivo)."""
import re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
src = root / 'src'
tpl = (src / 'index.tpl.html').read_text(encoding='utf-8')
core = (src / 'core.js').read_text(encoding='utf-8')
core = re.sub(r"\n?if\s*\(typeof module.*?\n?$", "\n", core, flags=re.S) if 'module.exports' in core else core
app = ''.join((src / f).read_text(encoding='utf-8') for f in ('app1.js', 'app2.js', 'app3.js'))
logo = (root / 'assets' / 'logo_rings.svgfrag').read_text(encoding='utf-8')
import base64
wm = base64.b64encode((root / 'assets' / 'orpa_wordmark.png').read_bytes()).decode()
out = tpl.replace('/*CSS*/', (src / 'style.css').read_text(encoding='utf-8')).replace('/*LOGO*/', logo).replace('/*WM*/', 'data:image/png;base64,'+wm)
out = out.replace('/*CORE*/', core.replace('</script', '<\\/script')).replace('/*APP*/', app.replace('</script', '<\\/script'))
(root / 'www').mkdir(exist_ok=True)
(root / 'www' / 'index.html').write_text(out, encoding='utf-8')
print('www/index.html', len(out), 'bytes')
