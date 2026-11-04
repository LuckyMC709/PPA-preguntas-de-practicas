/* Shared study rules: usable offline in the browser and in Node's test runner. */
(function (root) {
  "use strict";
  const scopes = ["all", "daily", "simulation", "review", "unseen", "bookmarked"];
  const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
  const count = (value) => Number.isSafeInteger(value) && value >= 0 ? value : 0;
  const empty = () => ({ questions: {}, sessions: [], bookmarks: [], active: null });
  function normalize(raw, questions) {
    const result = empty();
    if (!object(raw)) return result;
    const byId = new Map(questions.map((q) => [q.id, q]));
    if (object(raw.questions)) Object.entries(raw.questions).forEach(([id, item]) => {
      if (!byId.has(id) || !object(item)) return;
      result.questions[id] = {
        attempts: count(item.attempts), correct: count(item.correct), wrong: count(item.wrong),
        lastSeen: typeof item.lastSeen === "string" ? item.lastSeen : "",
        // v1 had no last-result field. Keep its errors available until practiced again.
        needsReview: (byId.get(id).answerRevision || 0) > count(item.answerRevision)
          || (typeof item.needsReview === "boolean" ? item.needsReview : count(item.wrong) > 0),
        answerRevision: count(item.answerRevision),
      };
    });
    result.bookmarks = Array.isArray(raw.bookmarks) ? [...new Set(raw.bookmarks.filter((id) => byId.has(id)))] : [];
    result.sessions = Array.isArray(raw.sessions) ? raw.sessions.filter((s) => object(s) && scopes.includes(s.scope)
      && Number.isInteger(s.total) && s.total > 0 && Number.isFinite(s.percent)
      && s.percent >= 0 && s.percent <= 100 && typeof s.completedAt === "string").slice(-100) : [];
    const active = raw.active;
    if (!object(active) || !Array.isArray(active.poolIds) || !object(active.config)) return result;
    const poolIds = [...new Set(active.poolIds.filter((id) => byId.has(id)))];
    if (!poolIds.length) return result;
    const scope = scopes.includes(active.config.scope) ? active.config.scope : "all";
    const answers = {};
    if (object(active.answers)) Object.entries(active.answers).forEach(([id, answer]) => {
      const q = byId.get(id);
      if (!poolIds.includes(id) || !object(answer) || !Number.isInteger(answer.selected)
        || answer.selected < 0 || answer.selected >= q.options.length
        || (q.answerRevision || 0) > count(answer.answerRevision)) return;
      answers[id] = { selected: answer.selected, isCorrect: answer.selected === q.correct, answerRevision: count(answer.answerRevision) };
    });
    const originalId = active.poolIds[count(active.index)];
    result.active = {
      poolIds, answers, index: Math.max(0, poolIds.indexOf(originalId)),
      config: { scope, order: active.config.order === "random" ? "random" : "ordered",
        chapter: String(active.config.chapter || "all") },
      startedAt: typeof active.startedAt === "string" ? active.startedAt : new Date().toISOString(),
    };
    return result;
  }
  function shuffle(items, random = Math.random) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  function pool(questions, config, memory, random = Math.random) {
    let items = questions.filter((q) => config.chapter === "all" || String(q.chapter) === config.chapter);
    if (config.scope === "review") items = items.filter((q) => memory.questions[q.id]?.needsReview);
    if (config.scope === "unseen") items = items.filter((q) => !memory.questions[q.id]?.attempts);
    if (config.scope === "bookmarked") items = items.filter((q) => memory.bookmarks.includes(q.id));
    if (["daily", "simulation"].includes(config.scope) || config.order === "random") items = shuffle(items, random);
    return items.slice(0, config.scope === "daily" ? 10 : config.scope === "simulation" ? 100 : items.length);
  }
  function record(memory, question, answer) {
    const item = memory.questions[question.id] || { attempts: 0, correct: 0, wrong: 0 };
    item.attempts += 1;
    if (answer.isCorrect) item.correct += 1;
    else item.wrong += 1;
    item.needsReview = !answer.isCorrect;
    item.answerRevision = question.answerRevision || 0;
    item.lastSeen = new Date().toISOString();
    memory.questions[question.id] = item;
  }
  const api = { empty, normalize, shuffle, pool, record };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PPA_STUDY = api;
})(typeof window !== "undefined" ? window : globalThis);
