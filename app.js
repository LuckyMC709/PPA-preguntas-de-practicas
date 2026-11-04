(() => {
  "use strict";

  const questions = Array.isArray(window.PPA_QUESTIONS) ? window.PPA_QUESTIONS : [];
  const letters = ["A", "B", "C", "D"];
  const homeView = document.querySelector("#home-view");
  const chapterSelect = document.querySelector("#chapter-select");
  const configForm = document.querySelector("#config-form");
  const setupView = document.querySelector("#setup-view");
  const quizView = document.querySelector("#quiz-view");
  const resultView = document.querySelector("#result-view");
  const aircraftView = document.querySelector("#aircraft-view");
  const theoryView = document.querySelector("#theory-view");
  const aircraftMaterialView = document.querySelector("#aircraft-material-view");
  const menuToggle = document.querySelector("#menu-toggle");
  const siteMenu = document.querySelector("#site-menu");
  const optionsList = document.querySelector("#options-list");
  const feedback = document.querySelector("#feedback");
  const feedbackIcon = document.querySelector("#feedback-icon");
  const feedbackTitle = document.querySelector("#feedback-title");
  const feedbackText = document.querySelector("#feedback-text");
  const figureLink = document.querySelector("#figure-link");
  const questionFigure = document.querySelector("#question-figure");
  const figureCaption = document.querySelector("#figure-caption");
  const figureImage = document.querySelector("#figure-image");
  const figureOpenLink = document.querySelector("#figure-open-link");
  const vfrReference = document.querySelector("#vfr-reference");
  const checkButton = document.querySelector("#check-button");
  const previousButton = document.querySelector("#previous-button");
  const nextButton = document.querySelector("#next-button");
  const answeredLabel = document.querySelector("#answered-label");
  const memoryStorageKey = "ppa-study-memory-v1";

  const core = window.PPA_STUDY;
  const scopeLabels = { all: "Banco completo", daily: "Repaso diario", simulation: "Simulacro", review: "Mis errores", unseen: "Sin practicar", bookmarked: "Mis marcadas" };
  let storageAvailable = true;

  function loadMemory() {
    try {
      const saved = JSON.parse(localStorage.getItem(memoryStorageKey) || "{}");
      return core.normalize(saved, questions);
    } catch {
      storageAvailable = false;
      return core.empty();
    }
  }

  let memory = loadMemory();

  const state = {
    pool: [],
    index: 0,
    pending: null,
    answers: new Map(),
    config: { scope: "all", order: "ordered", chapter: "all" },
  };

  function setMenuOpen(isOpen) {
    if (!menuToggle || !siteMenu) return;
    siteMenu.hidden = !isOpen;
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Cerrar menú" : "Abrir menú");
    menuToggle.classList.toggle("is-open", isOpen);
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  function showView(view) {
    [homeView, setupView, quizView, resultView, aircraftView, theoryView, aircraftMaterialView].forEach((item) => {
      if (item) item.hidden = item !== view;
    });
    closeMenu();
    if (view === setupView) renderMemorySummary();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function saveMemory() {
    try {
      localStorage.setItem(memoryStorageKey, JSON.stringify(memory));
    } catch {
      storageAvailable = false;
    }
    renderMemorySummary();
  }

  function renderMemorySummary() {
    const card = document.querySelector("#study-memory");
    if (!card) return;
    const active = memory.active;
    card.hidden = false;
    document.querySelector("#storage-status").textContent = storageAvailable ? "Guardado automático activo." : "No se pudo leer o guardar el progreso del navegador. Guardá una copia antes de cerrar.";
    document.querySelector("#home-resume").hidden = !active;
    document.querySelector("#memory-sessions").textContent = String(memory.sessions.length);
    document.querySelector("#memory-simulations").textContent = String(memory.sessions.filter((session) => session.scope === "simulation").length);
    document.querySelector("#memory-seen").textContent = String(Object.values(memory.questions).filter((item) => item.attempts > 0).length);
    document.querySelector("#memory-review").textContent = String(Object.values(memory.questions).filter((item) => item.needsReview).length);
    const resumeButton = document.querySelector("#resume-button");
    resumeButton.hidden = !active;
    if (active) {
      const answered = Object.keys(active.answers || {}).length;
      document.querySelector("#memory-summary").textContent = `${scopeLabels[active.config.scope]} · pregunta ${Math.min(active.index + 1, active.poolIds.length)} de ${active.poolIds.length} · ${answered} ${answered === 1 ? "contestada" : "contestadas"}`;
      document.querySelector("#home-resume-summary").textContent = document.querySelector("#memory-summary").textContent;
    } else {
      document.querySelector("#memory-summary").textContent = "El progreso y los intentos se guardan en este navegador.";
    }
    renderChapterProgress();
    renderBank();
  }

  function saveActivePractice() {
    if (!state.pool.length) return;
    memory.active = {
      poolIds: state.pool.map((question) => question.id),
      index: state.index,
      config: state.config,
      answers: Object.fromEntries(state.answers),
      startedAt: state.startedAt || new Date().toISOString(),
    };
    saveMemory();
  }

  function resumePractice() {
    if (!memory.active) return;
    const byId = new Map(questions.map((question) => [question.id, question]));
    const pool = memory.active.poolIds.map((id) => byId.get(id)).filter(Boolean);
    if (!pool.length) {
      memory.active = null;
      saveMemory();
      return;
    }
    state.pool = pool;
    state.index = Math.min(memory.active.index || 0, pool.length - 1);
    state.config = memory.active.config || { scope: "all", order: "ordered", chapter: "all" };
    state.answers = new Map(Object.entries(memory.active.answers || {}).map(([id, answer]) => [id, answer]));
    state.startedAt = memory.active.startedAt;
    state.completed = false;
    showView(quizView);
    renderQuestion();
    document.querySelector("#quiz-question").focus({ preventScroll: true });
  }

  window.PPA_NAVIGATION = {
    showHome() {
      showView(homeView);
      document.querySelector("#home-title")?.focus({ preventScroll: true });
    },
    showPpaSetup() {
      showView(setupView);
      document.querySelector("#setup-title")?.focus({ preventScroll: true });
    },
    showAircraft() {
      showView(aircraftView);
      window.PA28_NAVIGATION?.showLibrary();
      document.querySelector("#aircraft-title")?.focus({ preventScroll: true });
    },
    showTheory() {
      showView(theoryView);
      document.querySelector("#theory-title")?.focus({ preventScroll: true });
    },
    showAircraftMaterial() {
      showView(aircraftMaterialView);
      document.querySelector("#aircraft-material-title")?.focus({ preventScroll: true });
    },
  };

  function currentQuestion() {
    return state.pool[state.index];
  }

  function correctCount() {
    return [...state.answers.values()].filter((answer) => answer.isCorrect).length;
  }

  function populateChapters() {
    const chapters = [];
    questions.forEach((question) => {
      if (!chapters.some((item) => item.number === question.chapter)) {
        chapters.push({ number: question.chapter, name: question.chapterName });
      }
    });
    chapters.sort((a, b) => a.number - b.number);
    chapters.forEach((chapter) => {
      const option = document.createElement("option");
      option.value = String(chapter.number);
      option.textContent = `Capítulo ${chapter.number} · ${chapter.name}`;
      chapterSelect.appendChild(option);
    });
  }

  function updateSetupLabels() {
    const selectedScope = document.querySelector('input[name="scope"]:checked')?.value || "all";
    const selectedOrder = document.querySelector('input[name="order"]:checked')?.value || "ordered";
    const help = document.querySelector("#chapter-help");
    document.querySelectorAll('input[name="order"]').forEach((input) => { input.disabled = ["daily", "simulation"].includes(selectedScope); });
    document.querySelectorAll(".choice-card").forEach((card) => card.classList.toggle("selected", card.querySelector("input").checked));
    if (selectedScope === "simulation") {
      help.textContent = "Siempre al azar y sin corrección hasta finalizar. Con un capítulo elegido es un simulacro parcial, de hasta 100 preguntas.";
    } else if (selectedScope === "daily") {
      help.textContent = "El repaso diario elige siempre 10 preguntas al azar; el capítulo elegido limita el contenido.";
    } else if (selectedOrder === "random") {
      help.textContent = "Las preguntas se mezclan; las opciones conservan el orden del material oficial.";
    } else {
      help.textContent = "Podés elegir un capítulo si querés repasar un tema puntual.";
    }
  }

  function setOptionButtons(selectedIndex = null, locked = false) {
    [...optionsList.querySelectorAll(".option-button")].forEach((button) => {
      const optionIndex = Number(button.dataset.optionIndex);
      button.classList.toggle("selected", optionIndex === selectedIndex);
      button.classList.toggle("locked", locked);
      button.setAttribute("aria-checked", optionIndex === selectedIndex ? "true" : "false");
    });
  }

  function renderOptions(question, savedAnswer = null) {
    optionsList.replaceChildren();
    question.options.forEach((option, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "option-button";
      button.dataset.optionIndex = String(index);
      button.setAttribute("role", "radio");
      button.setAttribute("aria-checked", "false");

      const letter = document.createElement("span");
      letter.className = "option-letter";
      letter.textContent = letters[index];
      const text = document.createElement("span");
      text.className = "option-text";
      text.textContent = option;
      button.append(letter, text);

      button.addEventListener("click", () => {
        if (state.config.scope !== "simulation" && state.answers.has(question.id)) return;
        state.pending = index;
        setOptionButtons(index, false);
        checkButton.disabled = false;
        answeredLabel.textContent = "Listo para comprobar";
      });
      optionsList.appendChild(button);
    });

    if (savedAnswer) {
      const buttons = [...optionsList.querySelectorAll(".option-button")];
      buttons.forEach((button, index) => {
        if (index === savedAnswer.selected) button.classList.add("selected");
        if (state.config.scope !== "simulation") {
          if (index === question.correct) button.classList.add("correct");
          if (index === savedAnswer.selected && !savedAnswer.isCorrect) button.classList.add("incorrect");
        }
      });
      setOptionButtons(savedAnswer.selected, state.config.scope !== "simulation");
      checkButton.disabled = true;
    }
  }

  function renderFeedback(question, savedAnswer) {
    if (state.config.scope === "simulation") { feedback.hidden = true; return; }
    document.querySelector("#answer-source").textContent = `Clave de respuesta: ${question.answerSource}. La clave interactiva es una adaptación para estudiar; consultá el análisis original.`;
    const correctOption = `${letters[question.correct]}) ${question.options[question.correct]}`;
    feedback.hidden = false;
    feedback.classList.toggle("is-correct", savedAnswer.isCorrect);
    feedback.classList.toggle("is-incorrect", !savedAnswer.isCorrect);
    feedbackIcon.textContent = savedAnswer.isCorrect ? "✓" : "!";
    feedbackTitle.textContent = savedAnswer.isCorrect ? "Respuesta correcta" : "Para revisar";
    feedbackText.textContent = savedAnswer.isCorrect
      ? `Muy bien. La opción correcta es ${correctOption}. ${question.explanation || ""}`
      : `La correcta es ${correctOption}. ${question.explanation || 'Podés ampliar la explicación en “Teoría y análisis”.'}`;
    feedback.querySelector('a[href^="teoria-ppa.pdf"]').href = theoryUrl(question);
    figureLink.hidden = !question.hasFigure;
  }

  function renderQuestion() {
    const question = currentQuestion();
    if (!question) return;
    const savedAnswer = state.answers.get(question.id) || null;
    state.pending = null;

    document.querySelector("#quiz-scope-label").textContent = scopeLabels[state.config.scope] + (state.config.scope === "simulation" && state.pool.length < 100 ? " parcial" : "");
    checkButton.textContent = state.config.scope === "simulation" ? "Guardar respuesta" : "Comprobar respuesta";
    document.querySelector("#finish-confirm").hidden = true;
    const marked = memory.bookmarks.includes(question.id);
    document.querySelector("#bookmark-button").textContent = marked ? "★ Marcada" : "☆ Marcar";
    document.querySelector("#bookmark-button").setAttribute("aria-pressed", String(marked));
    document.querySelector("#quiz-chapter-label").textContent = `Capítulo ${question.chapter} · ${question.chapterName}`;
    document.querySelector("#question-number").textContent = `Pregunta ${question.number}`;
    document.querySelector("#quiz-question").textContent = question.question;
    const figureTag = document.querySelector("#question-figure-tag");
    figureTag.hidden = !question.hasFigure;
    questionFigure.hidden = !question.hasFigure;
    figureImage.hidden = true;
    vfrReference.hidden = true;
    if (question.hasFigure) {
      const figureRef = question.figureRefs?.[0] || "";
      figureCaption.textContent = figureRef === "5-4"
        ? "Figura 5-4 · Indicaciones VASI"
        : figureRef === "4-5"
          ? "Figura 4-5 · Regla de niveles VFR"
          : `Figura ${figureRef} · material oficial ANAC`;
      figureOpenLink.href = question.figurePage
        ? `figuras-ppa.pdf#page=${question.figurePage}`
        : "figuras-ppa.pdf";
      if (question.figureAsset) {
        figureImage.src = question.figureAsset;
        figureImage.alt = `Figura ${figureRef} del material oficial de PPA`;
        figureImage.hidden = false;
      } else if (figureRef === "4-5") {
        vfrReference.hidden = false;
      }
    }
    document.querySelector("#progress-label").textContent = `Pregunta ${state.index + 1} de ${state.pool.length}`;
    const percent = Math.round((state.answers.size / state.pool.length) * 1000) / 10;
    document.querySelector("#progress-percent").textContent = `${state.answers.size} respondidas · ${percent}%`;
    document.querySelector("#progress-bar").style.width = `${percent}%`;
    const simulation = state.config.scope === "simulation";
    document.querySelector("#score-label").textContent = simulation ? "Respondidas" : "Correctas";
    document.querySelector("#live-score").textContent = simulation ? `${state.answers.size} / ${state.pool.length}` : `${correctCount()} / ${state.answers.size}`;
    const questionMemory = memory.questions[question.id] || { attempts: 0, correct: 0, wrong: 0 };
    document.querySelector("#question-memory").hidden = simulation;
    document.querySelector("#question-memory").textContent = questionMemory.attempts
      ? `Practicada ${questionMemory.attempts} ${questionMemory.attempts === 1 ? "vez" : "veces"} · ${questionMemory.correct} ${questionMemory.correct === 1 ? "acierto" : "aciertos"}${questionMemory.wrong ? ` · ${questionMemory.wrong} ${questionMemory.wrong === 1 ? "error" : "errores"}` : ""}`
      : "Primera vez que practicás esta pregunta";
    previousButton.disabled = state.index === 0;
    const unanswered = state.pool.filter((item) => !state.answers.has(item.id)).length;
    nextButton.textContent = state.index === state.pool.length - 1
      ? (unanswered ? `Ver pendientes (${unanswered}) →` : "Ver resultado →")
      : "Siguiente →";
    answeredLabel.textContent = savedAnswer ? "Respuesta guardada" : "Podés responder ahora o seguir";

    renderOptions(question, savedAnswer);
    renderQuestionMap();
    if (savedAnswer) {
      renderFeedback(question, savedAnswer);
    } else {
      feedback.hidden = true;
      feedback.classList.remove("is-correct", "is-incorrect");
      figureLink.hidden = true;
      checkButton.disabled = true;
    }
  }

  function startPractice(event) {
    event.preventDefault();
    const scope = document.querySelector('input[name="scope"]:checked')?.value || "all";
    const order = document.querySelector('input[name="order"]:checked')?.value || "ordered";
    const chapter = chapterSelect.value;
    const config = { scope, order, chapter };
    const pool = core.pool(questions, config, memory);
    if (!pool.length) {
      document.querySelector("#setup-message").textContent = "No hay preguntas para esta selección. Probá otro capítulo o modalidad.";
      return;
    }
    if (memory.active && !window.confirm("Ya hay una práctica pausada. ¿Reemplazarla por esta nueva? El historial de respuestas se conserva.")) return;
    document.querySelector("#setup-message").textContent = "";
    beginPractice(pool, config);
  }

  function beginPractice(pool, config) {
    state.pool = pool;
    state.index = 0;
    state.pending = null;
    state.answers = new Map();
    state.config = config;
    state.startedAt = new Date().toISOString();
    state.completed = false;
    saveActivePractice();
    showView(quizView);
    renderQuestion();
    document.querySelector("#quiz-question").focus({ preventScroll: true });
  }

  function checkAnswer() {
    const question = currentQuestion();
    if (!question || state.pending === null || (state.config.scope !== "simulation" && state.answers.has(question.id))) return;
    const answer = { selected: state.pending, isCorrect: state.pending === question.correct, answerRevision: question.answerRevision || 0 };
    state.answers.set(question.id, answer);
    // Exam answers can be changed. Record just the final choice at completion.
    if (state.config.scope !== "simulation") core.record(memory, question, answer);
    saveActivePractice();
    renderQuestion();
    renderFeedback(question, answer);
  }

  function moveQuestion(direction) {
    const question = currentQuestion();
    if (!question) return;
    state.index = Math.max(0, Math.min(state.pool.length - 1, state.index + direction));
    saveActivePractice();
    renderQuestion();
    document.querySelector("#quiz-question").focus({ preventScroll: true });
  }

  function showResults() {
    const total = state.pool.length;
    const correct = correctCount();
    const wrong = [...state.answers.values()].filter((answer) => !answer.isCorrect).length;
    const unanswered = total - state.answers.size;
    const ratio = total ? (correct / total) * 100 : 0;
    const percent = Math.floor(ratio * 10) / 10;
    const isSimulation = state.config.scope === "simulation";
    const isDaily = state.config.scope === "daily";
    const passed = isSimulation && ratio >= 75;
    if (state.completed) return;
    state.completed = true;
    if (isSimulation) state.pool.forEach((q) => { if (state.answers.has(q.id)) core.record(memory, q, state.answers.get(q.id)); });

    document.querySelector("#result-title").textContent = passed
      ? "¡Aprobaste el simulacro!"
      : isDaily
        ? "Repaso diario terminado."
        : "Práctica terminada.";
    document.querySelector("#result-summary").textContent = isSimulation
      ? `Lograste ${percent}%. ${unanswered ? `Dejaste ${unanswered} sin responder. ` : ""}La referencia de aprobación es 75%, igual que en el examen teórico indicado por ANAC.`
      : isDaily
        ? `Terminaste el repaso diario: ${state.answers.size} respondidas y ${unanswered} sin responder.`
      : `Terminaste esta práctica: ${state.answers.size} respondidas y ${unanswered} sin responder. Usá los errores como guía para tu próximo repaso.`;
    const badge = document.querySelector("#result-badge");
    badge.textContent = isSimulation
      ? (passed ? "APROBADO · 75% o más" : "A seguir practicando · menos de 75%")
      : isDaily
        ? `${state.answers.size} de ${total} respondidas`
        : `${scopeLabels[state.config.scope]} · ${state.answers.size} de ${total} respondidas`;
    badge.className = `result-badge ${isSimulation ? (passed ? "pass" : "fail") : ""}`;
    document.querySelector("#result-correct").textContent = String(correct);
    document.querySelector("#result-wrong").textContent = String(wrong);
    document.querySelector("#result-unanswered").textContent = String(unanswered);
    document.querySelector("#result-percent").textContent = `${percent}%`;

    const mistakes = state.pool.filter((question) => !state.answers.get(question.id)?.isCorrect);
    document.querySelector("#retry-mistakes-button").hidden = mistakes.length === 0;
    const mistakesSection = document.querySelector("#mistakes-section");
    const mistakesList = document.querySelector("#mistakes-list");
    mistakesList.replaceChildren();
    mistakesSection.hidden = mistakes.length === 0;
    document.querySelector("#mistakes-count").textContent = `${mistakes.length} para repasar`;
    mistakes.forEach((question) => {
      const item = document.createElement("article");
      item.className = "mistake-item";
      const title = document.createElement("strong");
      title.textContent = `Capítulo ${question.chapter} · Pregunta ${question.number}: ${question.question}`;
      const answer = document.createElement("p");
      answer.innerHTML = `Correcta: <b>${letters[question.correct]}) ${escapeHtml(question.options[question.correct])}</b>`;
      const selected = document.createElement("p");
      const saved = state.answers.get(question.id);
      selected.textContent = saved ? `Tu respuesta: ${letters[saved.selected]}) ${question.options[saved.selected]}` : "Sin responder";
      const source = document.createElement("p");
      source.className = "question-source";
      source.textContent = `Clave: ${question.answerSource}`;
      const theory = document.createElement("a");
      theory.href = theoryUrl(question); theory.target = "_blank"; theory.rel = "noopener";
      theory.textContent = "Consultar teoría y análisis ↗"; theory.className = "inline-link";
      const explanation = document.createElement("p"); explanation.textContent = question.explanation || "";
      item.append(title, selected, answer, explanation, source, theory);
      mistakesList.appendChild(item);
    });
    memory.sessions.push({
      scope: state.config.scope,
      total,
      answered: state.answers.size,
      correct,
      wrong,
      unanswered,
      percent,
      completedAt: new Date().toISOString(),
    });
    memory.sessions = memory.sessions.slice(-100);
    memory.active = null;
    saveMemory();
    showView(resultView);
    document.querySelector("#result-title").focus({ preventScroll: true });
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function repeatPractice() {
    beginPractice([...state.pool], { ...state.config });
  }

  function goToSetup() {
    window.PPA_NAVIGATION.showPpaSetup();
  }

  function theoryUrl(question) {
    const chapterPages = { 1: 1, 2: 23, 3: 39, 4: 51, 5: 59, 6: 73, 7: 92, 8: 106 };
    return `teoria-ppa.pdf#page=${question.theoryPage || chapterPages[question.chapter] || 1}`;
  }

  function renderChapterProgress() {
    const container = document.querySelector("#chapter-progress");
    container.replaceChildren();
    [...new Set(questions.map((q) => q.chapter))].forEach((chapter) => {
      const pool = questions.filter((q) => q.chapter === chapter);
      const seen = pool.filter((q) => memory.questions[q.id]?.attempts).length;
      const review = pool.filter((q) => memory.questions[q.id]?.needsReview).length;
      const card = document.createElement("article"); card.className = "chapter-card";
      const title = document.createElement("h3"); title.textContent = `${chapter}. ${pool[0].chapterName}`;
      const detail = document.createElement("p"); detail.textContent = `${seen}/${pool.length} practicadas · ${review} para repasar`;
      const progress = document.createElement("progress"); progress.max = pool.length; progress.value = seen;
      progress.setAttribute("aria-label", `Cobertura del capítulo ${chapter}`);
      const button = document.createElement("button"); button.type = "button"; button.className = "text-button";
      button.textContent = review ? "Repasar errores →" : "Practicar capítulo →";
      button.addEventListener("click", () => {
        chapterSelect.value = String(chapter);
        document.querySelector(`input[name="scope"][value="${review ? "review" : "all"}"]`).checked = true;
        updateSetupLabels(); startPractice({ preventDefault() {} });
      });
      card.append(title, detail, progress, button); container.appendChild(card);
    });
  }

  const searchText = (text) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  function renderBank() {
    const input = document.querySelector("#bank-search");
    const term = searchText(input.value.trim());
    const found = questions.filter((q) => (chapterSelect.value === "all" || String(q.chapter) === chapterSelect.value)
      && searchText([q.id, q.question, ...q.options, q.chapterName].join(" ")).includes(term));
    const container = document.querySelector("#bank-results"); container.replaceChildren();
    document.querySelector("#bank-count").textContent = `${found.length} coincidencias${found.length > 30 ? " · se muestran las primeras 30; afiná la búsqueda" : ""}. Se aplica el capítulo elegido arriba.`;
    found.slice(0, 30).forEach((q) => {
      const button = document.createElement("button"); button.type = "button"; button.className = "bank-result";
      button.textContent = `${memory.bookmarks.includes(q.id) ? "★ " : ""}Cap. ${q.chapter} · ${q.number}. ${q.question}`;
      button.addEventListener("click", () => {
        if (memory.active && !window.confirm("¿Abrir esta pregunta y reemplazar la práctica pausada? El historial se conserva.")) return;
        beginPractice([q], { scope: "all", order: "ordered", chapter: String(q.chapter) });
      });
      container.appendChild(button);
    });
  }

  function renderQuestionMap() {
    const container = document.querySelector("#question-map"); container.replaceChildren();
    state.pool.forEach((q, index) => {
      const answered = state.answers.has(q.id), marked = memory.bookmarks.includes(q.id);
      const button = document.createElement("button"); button.type = "button";
      button.className = "map-button";
      button.classList.toggle("is-answered", answered);
      if (index === state.index) button.setAttribute("aria-current", "step");
      button.textContent = `${index + 1}${marked ? " ☆" : answered ? " ✓" : " ○"}`;
      button.setAttribute("aria-label", `Pregunta ${index + 1}, ${answered ? "respondida" : "pendiente"}${marked ? ", marcada" : ""}`);
      button.addEventListener("click", () => { state.index = index; saveActivePractice(); renderQuestion(); document.querySelector("#quiz-question").focus(); });
      container.appendChild(button);
    });
  }

  document.querySelector("#bookmark-button").addEventListener("click", () => {
    const id = currentQuestion().id;
    memory.bookmarks = memory.bookmarks.includes(id) ? memory.bookmarks.filter((item) => item !== id) : [...memory.bookmarks, id];
    saveMemory();
    const marked = memory.bookmarks.includes(id);
    document.querySelector("#bookmark-button").textContent = marked ? "★ Marcada" : "☆ Marcar";
    document.querySelector("#bookmark-button").setAttribute("aria-pressed", String(marked));
    renderQuestionMap();
  });
  document.querySelector("#bank-search").addEventListener("input", renderBank);
  chapterSelect.addEventListener("change", renderBank);
  document.querySelector("#home-resume-button").addEventListener("click", resumePractice);
  document.querySelector("#retry-mistakes-button").addEventListener("click", () => {
    const pool = state.pool.filter((q) => !state.answers.get(q.id)?.isCorrect);
    if (pool.length) beginPractice(pool, { scope: "review", order: "ordered", chapter: "all" });
  });
  document.querySelector("#finish-button").addEventListener("click", () => {
    document.querySelector("#finish-warning").textContent = `Vas a finalizar con ${state.pool.length - state.answers.size} preguntas sin responder. Se cuentan en el total. ¿Ver el resultado?`;
    document.querySelector("#finish-confirm").hidden = false;
    document.querySelector("#finish-confirm-button").focus();
  });
  document.querySelector("#finish-cancel").addEventListener("click", () => { document.querySelector("#finish-confirm").hidden = true; });
  document.querySelector("#finish-confirm-button").addEventListener("click", showResults);
  document.addEventListener("keydown", (event) => {
    if (quizView.hidden || event.altKey || event.ctrlKey || event.metaKey || !siteMenu.hidden) return;
    if (event.target.closest("input, select, textarea, summary, a") || !document.querySelector("#finish-confirm").hidden) return;
    if (/^[1-4]$/.test(event.key)) {
      const button = optionsList.children[Number(event.key) - 1];
      if (button) { event.preventDefault(); button.click(); }
    } else if (["ArrowLeft", "ArrowRight"].includes(event.key) && !event.target.closest(".question-map")) {
      event.preventDefault(); (event.key === "ArrowLeft" ? previousButton : nextButton).click();
    } else if (event.key === "Enter" && !event.target.closest("button")) {
      event.preventDefault(); (checkButton.disabled ? nextButton : checkButton).click();
    }
  });
  document.querySelector("#export-progress").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ format: "ppa-study-backup", version: 1, exportedAt: new Date().toISOString(), memory }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a");
    link.href = url; link.download = `ppa-progreso-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  document.querySelector("#import-progress").addEventListener("change", async (event) => {
    const file = event.target.files[0]; if (!file) return;
    try {
      if (file.size > 2000000) throw new Error("La copia es demasiado grande.");
      const backup = JSON.parse(await file.text());
      if (backup?.format !== "ppa-study-backup" || backup.version !== 1 || !backup.memory || typeof backup.memory !== "object" || Array.isArray(backup.memory)) throw new Error("El archivo no es una copia de progreso PPA válida.");
      const restored = core.normalize(backup.memory, questions);
      if (!window.confirm("Restaurar reemplaza el progreso de este navegador. Guardá una copia del actual si querés conservarlo. ¿Continuar?")) return;
      memory = restored; state.pool = []; state.answers = new Map();
      saveMemory();
      document.querySelector("#storage-status").textContent = storageAvailable ? "Copia restaurada." : "Copia cargada, pero el navegador no permite guardarla. Exportala antes de cerrar.";
    } catch (error) { document.querySelector("#storage-status").textContent = `No se restauró la copia: ${error.message}`; }
    finally { event.target.value = ""; }
  });

  configForm.addEventListener("submit", startPractice);
  checkButton.addEventListener("click", checkAnswer);
  previousButton.addEventListener("click", () => moveQuestion(-1));
  nextButton.addEventListener("click", () => {
    const question = currentQuestion();
    if (!question) return;
    if (state.index === state.pool.length - 1) {
      const pendingIndex = state.pool.findIndex((item) => !state.answers.has(item.id));
      if (pendingIndex >= 0) {
        state.index = pendingIndex;
        saveActivePractice();
        renderQuestion();
        document.querySelector("#quiz-question").focus({ preventScroll: true });
      } else showResults();
    } else moveQuestion(1);
  });
  document.querySelector("#quit-button").addEventListener("click", goToSetup);
  document.querySelector("#ppa-home-button").addEventListener("click", window.PPA_NAVIGATION.showHome);
  document.querySelector("#ppa-area-button").addEventListener("click", window.PPA_NAVIGATION.showPpaSetup);
  document.querySelector("#theory-area-button").addEventListener("click", window.PPA_NAVIGATION.showTheory);
  document.querySelector("#aircraft-material-area-button").addEventListener("click", window.PPA_NAVIGATION.showAircraftMaterial);
  document.querySelector("#theory-home-button").addEventListener("click", window.PPA_NAVIGATION.showHome);
  document.querySelector("#aircraft-material-aircraft-button").addEventListener("click", window.PPA_NAVIGATION.showAircraft);
  document.querySelector(".brand").addEventListener("click", (event) => {
    event.preventDefault();
    window.PPA_NAVIGATION.showHome();
  });
  menuToggle.addEventListener("click", () => setMenuOpen(siteMenu.hidden));
  siteMenu.querySelectorAll("[data-nav]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const navigation = {
        home: window.PPA_NAVIGATION.showHome,
        ppa: window.PPA_NAVIGATION.showPpaSetup,
        aircraft: window.PPA_NAVIGATION.showAircraft,
        theory: window.PPA_NAVIGATION.showTheory,
        "aircraft-material": window.PPA_NAVIGATION.showAircraftMaterial,
      }[link.dataset.nav];
      navigation?.();
    });
  });
  document.addEventListener("click", (event) => {
    if (!siteMenu.hidden && !event.target.closest(".topbar")) closeMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !siteMenu.hidden) { closeMenu(); menuToggle.focus(); }
  });
  document.querySelector("#restart-button").addEventListener("click", repeatPractice);
  document.querySelector("#new-practice-button").addEventListener("click", goToSetup);
  document.querySelectorAll('input[name="scope"], input[name="order"]').forEach((input) => input.addEventListener("change", updateSetupLabels));
  chapterSelect.addEventListener("change", updateSetupLabels);
  document.querySelector("#resume-button").addEventListener("click", resumePractice);

  populateChapters();
  updateSetupLabels();
  renderMemorySummary();
  if (!questions.length) {
    document.querySelector("#setup-title").textContent = "No se pudo cargar el banco de preguntas.";
    configForm.hidden = true;
  }
})();
