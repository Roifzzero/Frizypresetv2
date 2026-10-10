"""Uji NYATA ke TikTok (butuh internet + yt-dlp): python test_live.py <link-tiktok>"""
import json, sys, time
import server as S
url = sys.argv[1] if len(sys.argv) > 1 else input('Link TikTok: ').strip()
t = time.time()
print('1) Info video via yt-dlp ...')
d = S.do_extract(url, quick=True)
v = d['video']; print('   OK  @%s | %s | media: %s' % (v['author'], v['desc'][:60], [m['key'] for m in v['media']]))
print('   link di caption:', [l['url'] for l in d['links']])
print('2) Komentar (bagian paling rapuh) ...')
c = S.fetch_comments(v['id'], v['author'], 100)
print('   %d komentar/balasan terbaca' % len(c))
if not c: print('   !! 0 komentar: endpoint komentar TikTok mungkin berubah. Kirim output ini ke Claude.')
full = S.do_extract(url, quick=False)
print('3) Total link ditemukan:', len(full['links']), json.dumps([(l['type'], l['url'], l['is_creator']) for l in full['links']], ensure_ascii=False)[:600])
print('selesai dalam %.1f dtk' % (time.time() - t))
