# -*- coding: utf-8 -*-
# 허브(hadmin)에서 쓰는 Material Symbols 아이콘만 남긴 subset 폰트를 다시 만든다.
# 아이콘 이름은 코드 전체의 소문자 토큰 중 폰트 리거처에 실제 있는 이름과의 교집합으로 뽑는다(statCard('how_to_reg', …)처럼 인자로 넘긴 것도 잡힘).
import re, sys, os, glob, urllib.request
from fontTools.ttLib import TTFont
from fontTools import subset
sys.stdout.reconfigure(encoding='utf-8')
ROOT = r'C:\Users\Public\hadmin'
WORK = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1]
FULL = os.path.join(WORK, 'full.woff2')
if not os.path.exists(FULL):
    UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
    css = urllib.request.urlopen(urllib.request.Request('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200', headers={'User-Agent': UA})).read().decode()
    url = re.search(r'url\((https://[^)]+\.woff2)\)', css).group(1)
    open(FULL, 'wb').write(urllib.request.urlopen(url).read())
font = TTFont(FULL)
rev = {v: k for k, v in font.getBestCmap().items()}
def ligs():
    for lk in font['GSUB'].table.LookupList.Lookup:
        for st in lk.SubTable:
            st = getattr(st, 'ExtSubTable', st)
            if getattr(st, 'LookupType', None) == 4:
                for first, arr in st.ligatures.items():
                    for lg in arr:
                        name = ''.join(chr(rev[g]) for g in [first] + lg.Component if g in rev)
                        yield name, st, first, lg
allnames = {n for n, *_ in ligs()}
tokens = set()
for f in glob.glob(ROOT + r'\**\*.js', recursive=True) + glob.glob(ROOT + r'\*.html'):
    tokens |= set(re.findall(r'[a-z][a-z0-9_]{2,}', open(f, encoding='utf-8', errors='ignore').read()))
want = sorted(tokens & allnames)
print('아이콘', len(want))
keep = set(want)
for lk in font['GSUB'].table.LookupList.Lookup:
    for st in lk.SubTable:
        st = getattr(st, 'ExtSubTable', st)
        if getattr(st, 'LookupType', None) == 4:
            for first in list(st.ligatures):
                st.ligatures[first] = [lg for lg in st.ligatures[first] if ''.join(chr(rev[g]) for g in [first] + lg.Component if g in rev) in keep]
                if not st.ligatures[first]: del st.ligatures[first]
opts = subset.Options(); opts.flavor = 'woff2'; opts.layout_features = ['liga', 'rlig', 'calt']; opts.notdef_outline = True
sub = subset.Subsetter(opts)
sub.populate(text=''.join(sorted(set(''.join(want)))) + 'abcdefghijklmnopqrstuvwxyz0123456789_')
sub.subset(font)
font.flavor = 'woff2'; font.save(OUT)
print(OUT, os.path.getsize(OUT))
open(os.path.join(WORK, 'icons.txt'), 'w', encoding='utf-8').write('\n'.join(want))
