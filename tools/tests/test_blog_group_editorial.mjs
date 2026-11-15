import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {loadBlogGroupEditorial, reviseBlogGroupEditorial, buildBlogGroupStyles} from '../blog-group-editorial.mjs';
import {loadReviewedArticlePresentation} from '../reviewed-article-presentation.mjs';

test('eight teaser summaries reuse the reviewed source without extending article/card counts', async () => {
  const [blog, group] = await loadBlogGroupEditorial(), rows = await loadReviewedArticlePresentation(), canonical = rows.find(r => r.key === 'blog').articles;
  assert.equal(rows.length, 41); assert.equal(canonical.length, 54); assert.equal(rows.reduce((n, r) => n + (r.cardKeys?.length || 0), 0), 197);
  assert.deepEqual(blog.summaries.map(a => a.postId), [6396, 6376, 6387, 6678, 7506, 7492, 6394, 6534]);
  for (const a of blog.summaries) assert.deepEqual(a, canonical.find(r => r.key === a.key));
  assert.equal(group.key, 'stagshens'); assert.equal((group.markup.match(/<template /g) || []).length, 3);
  assert.match(group.markup, /9 PM/); assert.match(group.markup, /aged 18 or older/); assert.doesNotMatch(group.markup, /[{}]|<(?:img|form|input|script|style|iframe|h[1-6])\b/);
});
test('group copy distinguishes shared/private arrangements and individual quotes', async () => {
  const [, group] = await loadBlogGroupEditorial();
  for (const text of ['Your individual quote confirms', 'Sending the form is a request', 'Our team replies by email after reviewing', 'listed activities are enquiry options', 'guaranteed admission or priority entry']) assert.ok(group.markup.includes(text));
  assert.doesNotMatch(group.markup, /absolutely legless|professional drunk guides|hundreds of other local companies|24\/7|within \d+ hours|lowest.price/);
  assert.deepEqual(reviseBlogGroupEditorial({key: 'post-hostel-hangover-cure'}), []);
});
test('scoped style insertion is byte-preserving, idempotent and rejects drift atomically', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'ktk-blog-group-'));
  try {
    const file = path.join(dir, 'runtime.css'), base = await readFile(new URL('../../staging/wp-content/mu-plugins/ktk-code-pages-assets/runtime.css', import.meta.url), 'utf8');
    assert.ok(!base.includes('/* BEGIN Group enquiry overview */') || base.includes('/* END Group enquiry overview */'));
    const original = base.replace(/\/\* BEGIN Group enquiry overview \*\/[\s\S]*?\/\* END Group enquiry overview \*\/\n/, '');
    await writeFile(file, original); await buildBlogGroupStyles(file); const once = await readFile(file, 'utf8');
    assert.equal(once.replace(/\/\* BEGIN Group enquiry overview \*\/[\s\S]*?\/\* END Group enquiry overview \*\/\n/, ''), original);
    await buildBlogGroupStyles(file); assert.equal(await readFile(file, 'utf8'), once);
    for (const bad of [once.replace('font-size: 16px', 'font-size: 17px'), once + '/* BEGIN Group enquiry overview */', once.replace('/* END Group enquiry overview */', ''), original.replace('/* END reduced-motion slide content */', 'missing')]) {
      await writeFile(file, bad); await assert.rejects(() => buildBlogGroupStyles(file)); assert.equal(await readFile(file, 'utf8'), bad);
    }
  } finally {assert.ok(path.resolve(dir).startsWith(path.resolve(tmpdir()) + path.sep + 'ktk-blog-group-')); await rm(dir, {recursive: true, force: true});}
});
