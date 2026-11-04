const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const core = require('../study-core.js');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../questions.js'), 'utf8'), context);
const questions = JSON.parse(JSON.stringify(context.window.PPA_QUESTIONS));

test('the complete bank has unique valid answers and existing figure assets', () => {
  assert.equal(questions.length, 313);
  assert.equal(new Set(questions.map(q => q.id)).size, 313);
  assert.equal(new Set(questions.map(q => q.chapter)).size, 8);
  for (const q of questions) {
    assert.ok(q.question && q.options.length >= 2 && q.options.every(Boolean), q.id);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < q.options.length, q.id);
    if (q.figureAsset) assert.ok(fs.existsSync(path.join(__dirname, '..', q.figureAsset)), q.id);
  }
});

test('v1 memory migrates and old errors resolve after a subsequent correct answer', () => {
  const q = questions[0];
  const memory = core.normalize({ questions: { [q.id]: { attempts: 2, correct: 1, wrong: 1 } } }, questions);
  assert.equal(core.pool(questions, { scope: 'review', chapter: 'all' }, memory).length, 1);
  core.record(memory, q, { isCorrect: true });
  assert.equal(memory.questions[q.id].attempts, 3);
  assert.equal(memory.questions[q.id].wrong, 1);
  assert.equal(core.pool(questions, { scope: 'review', chapter: 'all' }, memory).length, 0);
});

test('simulation samples across the bank even when ordered was selected', () => {
  const config = { scope: 'simulation', chapter: 'all', order: 'ordered' };
  const pool = core.pool(questions, config, core.empty(), () => 0);
  assert.equal(pool.length, 100);
  assert.equal(new Set(pool.map(q => q.id)).size, 100);
  assert.notDeepEqual(pool.map(q => q.id), questions.slice(0, 100).map(q => q.id));
  assert.equal(questions[0].id, 'anac-1-1');
});

test('all study modes respect chapter and empty selections', () => {
  const memory = core.empty();
  memory.bookmarks = [questions[0].id, questions.at(-1).id];
  core.record(memory, questions[0], { isCorrect: false });
  assert.equal(core.pool(questions, { scope: 'daily', chapter: '7' }, memory).length, 10);
  assert.equal(core.pool(questions, { scope: 'simulation', chapter: '7' }, memory).length, 22);
  assert.equal(core.pool(questions, { scope: 'bookmarked', chapter: '1' }, memory).length, 1);
  assert.equal(core.pool(questions, { scope: 'review', chapter: '8' }, memory).length, 0);
  assert.equal(core.pool(questions, { scope: 'unseen', chapter: 'all' }, memory).length, 312);
});

test('corrupt memory cannot introduce invalid questions, indexes or forged scores', () => {
  for (const raw of [null, [], 42, 'bad', { active: { poolIds: [] } }]) {
    assert.deepEqual(core.normalize(raw, questions), core.empty());
  }
  const id = questions[0].id;
  const memory = core.normalize({ questions: { [id]: null }, bookmarks: [id, id, 'missing'], active: {
    poolIds: ['missing', id, id], index: -20, config: { scope: 'unknown' },
    answers: { [id]: { selected: 0, isCorrect: true }, missing: { selected: 0 } },
  } }, questions);
  assert.deepEqual(memory.bookmarks, [id]);
  assert.deepEqual(memory.active.poolIds, [id]);
  assert.equal(memory.active.index, 0);
  assert.equal(memory.active.answers[id].isCorrect, false);
  assert.equal(memory.active.config.scope, 'all');
});

test('resumption preserves order, selected answers and the current question', () => {
  const memory = core.empty();
  const poolIds = [questions[9].id, questions[1].id, questions[20].id];
  memory.active = { poolIds, index: 1, config: { scope: 'daily', order: 'random', chapter: 'all' },
    answers: { [poolIds[0]]: { selected: questions[9].correct } }, startedAt: '2026-11-03T12:00:00Z' };
  const restored = core.normalize(JSON.parse(JSON.stringify(memory)), questions);
  assert.deepEqual(restored.active.poolIds, poolIds);
  assert.equal(restored.active.index, 1);
  assert.equal(restored.active.answers[poolIds[0]].isCorrect, true);
  assert.equal(restored.active.startedAt, memory.active.startedAt);
});

test('reviewed answer keys match their documented source and invalidate obsolete saved answers', () => {
  const reviews = JSON.parse(fs.readFileSync(path.join(__dirname, '../scripts/answer_reviews.json'), 'utf8'));
  assert.equal(Object.keys(reviews).length, 7);
  for (const [id, review] of Object.entries(reviews)) {
    const q = questions.find(q => q.id === id);
    assert.equal(q.correct, review.correct, id);
    assert.equal(q.theoryPage, review.theoryPage, id);
    assert.ok(q.explanation && q.answerSource.includes('clave revisada'), id);
    const old = core.normalize({ questions: { [id]: { attempts: 1, correct: 1, wrong: 0 } },
      active: { poolIds: [id], index: 0, config: { scope: 'all' }, answers: { [id]: { selected: 0 } } },
    }, questions);
    assert.equal(old.questions[id].needsReview, true, id);
    assert.equal(Object.keys(old.active.answers).length, 0, id);
    core.record(old, q, { isCorrect: true });
    assert.equal(core.normalize(old, questions).questions[id].needsReview, false, id);
  }
});
