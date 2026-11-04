const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const base = path.join(__dirname, '..');
const key = 'ppa-study-memory-v1';

function app({ saved, blocked = false, limit } = {}) {
  const dom = new JSDOM(fs.readFileSync(path.join(base, 'index.html'), 'utf8'), {
    url: 'https://ppa.test/', runScripts: 'outside-only', pretendToBeVisual: true,
  });
  const w = dom.window;
  w.scrollTo = () => {};
  w.confirm = () => true;
  if (saved !== undefined) w.localStorage.setItem(key, typeof saved === 'string' ? saved : JSON.stringify(saved));
  if (blocked) Object.defineProperty(w, 'localStorage', { get() { throw new Error('Storage blocked'); } });
  for (const file of ['questions.js', 'aircraft-data.js', 'study-core.js', 'app.js', 'aircraft.js']) {
    if (file === 'app.js' && limit) w.PPA_QUESTIONS = w.PPA_QUESTIONS.slice(0, limit);
    w.eval(fs.readFileSync(path.join(base, file), 'utf8'));
  }
  const $ = selector => w.document.querySelector(selector);
  const click = selector => $(selector).click();
  const memory = () => JSON.parse(w.localStorage.getItem(key));
  const start = (scope = 'all', chapter = 'all') => {
    click('#ppa-area-button');
    $(`input[name="scope"][value="${scope}"]`).checked = true;
    $('#chapter-select').value = chapter;
    $('#config-form').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  };
  const answer = index => { click(`#options-list button:nth-child(${index + 1})`); click('#check-button'); };
  const finish = () => { click('#finish-button'); click('#finish-confirm-button'); };
  return { dom, w, $, click, memory, start, answer, finish };
}

test('answer, bookmark, skip and reload resume the exact practice without duplicate attempts', () => {
  const first = app();
  first.start(); first.answer(0); first.click('#bookmark-button'); first.click('#next-button');
  const saved = first.memory(); first.dom.window.close();
  const next = app({ saved });
  next.click('#home-resume-button');
  assert.match(next.$('#progress-label').textContent, /2 de 313/);
  next.click('#previous-button');
  assert.equal(next.$('#bookmark-button').getAttribute('aria-pressed'), 'true');
  assert.equal(next.$('#feedback').hidden, false);
  assert.equal(next.memory().questions['anac-1-1'].attempts, 1);
  next.dom.window.close();
});

test('simulation hides correctness and records only final changed answers once', () => {
  const a = app(); a.start('simulation');
  const id = a.memory().active.poolIds[0];
  const q = a.w.PPA_QUESTIONS.find(q => q.id === id);
  a.answer((q.correct + 1) % q.options.length);
  assert.equal(a.$('#feedback').hidden, true);
  assert.equal(a.w.document.querySelectorAll('#options-list .selected').length, 1);
  assert.equal(a.$('#question-memory').hidden, true);
  assert.equal(a.w.document.querySelectorAll('#options-list .correct, #options-list .incorrect').length, 0);
  assert.equal(Object.keys(a.memory().questions).length, 0);
  a.answer(q.correct);
  a.finish();
  assert.equal(a.memory().questions[id].attempts, 1);
  assert.equal(a.memory().questions[id].correct, 1);
  assert.equal(a.$('#result-unanswered').textContent, '99');
  a.click('#finish-confirm-button');
  assert.equal(a.memory().sessions.length, 1);
  a.dom.window.close();
});

test('finishing a partial practice includes unanswered questions and retries them', () => {
  const a = app(); a.start('daily'); a.finish();
  assert.equal(a.$('#result-unanswered').textContent, '10');
  assert.equal(a.w.document.querySelectorAll('#mistakes-list .mistake-item').length, 10);
  a.click('#retry-mistakes-button');
  assert.equal(a.memory().active.poolIds.length, 10);
  assert.equal(a.$('#quiz-view').hidden, false);
  a.dom.window.close();
});

test('correctly answering a previous error removes it from review', () => {
  const a = app(); a.start(); a.answer(0); a.finish();
  assert.equal(a.memory().questions['anac-1-1'].needsReview, true);
  a.start('review');
  assert.equal(a.memory().active.poolIds.length, 1);
  a.answer(1); a.finish();
  assert.equal(a.memory().questions['anac-1-1'].needsReview, false);
  a.start('review');
  assert.match(a.$('#setup-message').textContent, /No hay preguntas/);
  a.dom.window.close();
});

test('storage failures and malformed saved data leave the app usable', () => {
  for (const options of [{ saved: '{' }, { saved: null }, { saved: { active: { poolIds: ['anac-1-1'] } } }, { blocked: true }]) {
    const a = app(options); a.start(); a.answer(0);
    assert.equal(a.$('#quiz-view').hidden, false);
    if (options.blocked) assert.match(a.$('#storage-status').textContent, /No se pudo/);
    a.dom.window.close();
  }
});

test('74.6% is not rounded into an exam pass', () => {
  const a = app({ limit: 67 });
  const qs = a.w.PPA_QUESTIONS;
  a.dom.window.close();
  const answers = Object.fromEntries(qs.map((q, i) => [q.id, { selected: i < 50 ? q.correct : (q.correct + 1) % q.options.length, answerRevision: q.answerRevision || 0 }]));
  const b = app({ limit: 67, saved: { active: { poolIds: qs.map(q => q.id), index: 66,
    config: { scope: 'simulation', order: 'random', chapter: 'all' }, answers } } });
  b.click('#home-resume-button'); b.finish();
  assert.equal(b.$('#result-percent').textContent, '74.6%');
  assert.match(b.$('#result-badge').textContent, /menos de 75/);
  b.dom.window.close();
});

test('all original study areas and their local documents remain reachable', () => {
  const a = app();
  for (const [button, view] of [['#theory-area-button', '#theory-view'], ['#aircraft-area-button', '#aircraft-view'], ['#aircraft-material-area-button', '#aircraft-material-view']]) {
    a.click(button); assert.equal(a.$(view).hidden, false);
  }
  for (const item of a.w.PA28_MATERIAL) assert.ok(fs.existsSync(path.join(base, item.file)));
  assert.equal(a.w.document.querySelectorAll('#material-library .material-card').length, 13);
  const ids = [...a.w.document.querySelectorAll('[id]')].map(el => el.id);
  assert.equal(new Set(ids).size, ids.length, 'no duplicate element IDs');
  a.dom.window.close();
});


test('backup import restores the exact practice and rejects unrelated files without overwriting progress', async () => {
  const a = app(); a.start('daily'); a.answer(0); a.click('#next-button');
  const original = a.memory();
  const b = app();
  const importFile = async text => {
    Object.defineProperty(b.$('#import-progress'), 'files', { configurable: true, value: [{ size: text.length, text: async () => text }] });
    b.$('#import-progress').dispatchEvent(new b.w.Event('change'));
    await new Promise(resolve => setImmediate(resolve));
  };
  await importFile(JSON.stringify({ format: 'ppa-study-backup', version: 1, memory: original }));
  assert.deepEqual(b.memory().active.poolIds, original.active.poolIds);
  assert.equal(b.memory().active.index, 1);
  b.click('#home-resume-button');
  assert.match(b.$('#progress-label').textContent, /2 de 10/);
  await importFile('{"something":"else"}');
  assert.deepEqual(b.memory().active.poolIds, original.active.poolIds);
  assert.match(b.$('#storage-status').textContent, /No se restauró/);
  a.dom.window.close(); b.dom.window.close();
});

test('PA-28 allows returning from an unanswered question and repeats the same questions', () => {
  const a = app(); a.click('#aircraft-area-button'); a.click('.review-start[data-topic="all"]');
  const question = a.$('#aircraft-question').textContent;
  a.click('#aircraft-options button'); a.click('#aircraft-check-button'); a.click('#aircraft-next-button');
  a.click('#aircraft-previous-button');
  assert.equal(a.$('#aircraft-question').textContent, question);
  a.click('#aircraft-next-button');
  for (let i = 1; i < 10; i++) {
    a.click('#aircraft-options button'); a.click('#aircraft-check-button'); a.click('#aircraft-next-button');
  }
  assert.equal(a.$('#aircraft-result-panel').hidden, false);
  a.click('#aircraft-restart-button');
  assert.equal(a.$('#aircraft-question').textContent, question);
  a.dom.window.close();
});
