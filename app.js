(() => {
  "use strict";

  const questions = Array.isArray(window.PPA_QUESTIONS) ? window.PPA_QUESTIONS : [];
  const letters = ["A", "B", "C", "D"];
  const chapterSelect = document.querySelector("#chapter-select");
  const configForm = document.querySelector("#config-form");
  const setupView = document.querySelector("#setup-view");
  const quizView = document.querySelector("#quiz-view");
  const resultView = document.querySelector("#result-view");
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

  const state = {
    pool: [],
    index: 0,
    pending: null,
    answers: new Map(),
    config: { scope: "all", order: "ordered", chapter: "all" },
  };

  function shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function showView(view) {
    [setupView, quizView, resultView].forEach((item) => { item.hidden = item !== view; });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

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
    if (selectedScope === "simulation") {
      help.textContent = "El simulacro usa hasta 100 preguntas; el capítulo elegido limita el contenido.";
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
      button.classList.toggle("selected", optionIndex === selectedIndex && !locked);
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
        if (state.answers.has(question.id)) return;
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
        if (index === question.correct) button.classList.add("correct");
        if (index === savedAnswer.selected && !savedAnswer.isCorrect) button.classList.add("incorrect");
      });
      setOptionButtons(savedAnswer.selected, true);
      checkButton.disabled = true;
    }
  }

  function renderFeedback(question, savedAnswer) {
    const correctOption = `${letters[question.correct]}) ${question.options[question.correct]}`;
    feedback.hidden = false;
    feedback.classList.toggle("is-correct", savedAnswer.isCorrect);
    feedback.classList.toggle("is-incorrect", !savedAnswer.isCorrect);
    feedbackIcon.textContent = savedAnswer.isCorrect ? "✓" : "!";
    feedbackTitle.textContent = savedAnswer.isCorrect ? "Respuesta correcta" : "Para revisar";
    feedbackText.textContent = savedAnswer.isCorrect
      ? `Muy bien. La opción correcta es ${correctOption}`
      : `La correcta es ${correctOption}; podés ampliar la explicación en “Teoría y análisis”.`;
    figureLink.hidden = !question.hasFigure;
  }

  function renderQuestion() {
    const question = currentQuestion();
    if (!question) return;
    const savedAnswer = state.answers.get(question.id) || null;
    state.pending = null;

    document.querySelector("#quiz-scope-label").textContent = state.config.scope === "simulation"
      ? "Simulacro ANAC"
      : state.config.scope === "daily"
        ? "Repaso diario"
        : "Banco completo";
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
    const percent = Math.max(1, Math.round(((state.index + 1) / state.pool.length) * 100));
    document.querySelector("#progress-percent").textContent = `${percent}%`;
    document.querySelector("#progress-bar").style.width = `${percent}%`;
    document.querySelector("#live-score").textContent = `${correctCount()} / ${state.answers.size}`;
    previousButton.disabled = state.index === 0;
    nextButton.textContent = state.index === state.pool.length - 1 ? "Ver resultado →" : "Siguiente →";
    answeredLabel.textContent = savedAnswer ? "Respuesta guardada" : "Respondé para continuar";

    renderOptions(question, savedAnswer);
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
    let pool = questions.filter((question) => chapter === "all" || String(question.chapter) === chapter);

    if (scope === "daily") {
      pool = shuffle(pool).slice(0, Math.min(10, pool.length));
    } else {
      if (order === "random") pool = shuffle(pool);
      if (scope === "simulation") pool = pool.slice(0, Math.min(100, pool.length));
    }

    state.pool = pool;
    state.index = 0;
    state.pending = null;
    state.answers = new Map();
    state.config = { scope, order, chapter };
    showView(quizView);
    renderQuestion();
    document.querySelector("#quiz-question").focus({ preventScroll: true });
  }

  function checkAnswer() {
    const question = currentQuestion();
    if (!question || state.pending === null || state.answers.has(question.id)) return;
    const answer = { selected: state.pending, isCorrect: state.pending === question.correct };
    state.answers.set(question.id, answer);
    renderQuestion();
    renderFeedback(question, answer);
  }

  function moveQuestion(direction) {
    const question = currentQuestion();
    if (!question) return;
    if (!state.answers.has(question.id)) {
      answeredLabel.textContent = "Primero elegí y comprobá una respuesta";
      return;
    }
    state.index = Math.max(0, Math.min(state.pool.length - 1, state.index + direction));
    renderQuestion();
    document.querySelector("#quiz-question").focus({ preventScroll: true });
  }

  function showResults() {
    const total = state.pool.length;
    const correct = correctCount();
    const wrong = total - correct;
    const percent = total ? Math.round((correct / total) * 100) : 0;
    const isSimulation = state.config.scope === "simulation";
    const isDaily = state.config.scope === "daily";
    const passed = isSimulation && percent >= 75;

    document.querySelector("#result-title").textContent = passed
      ? "¡Aprobaste el simulacro!"
      : isDaily
        ? "Repaso diario terminado."
        : "Práctica terminada.";
    document.querySelector("#result-summary").textContent = isSimulation
      ? `Lograste ${percent}%. La referencia de aprobación es 75%, igual que en el examen teórico indicado por ANAC.`
      : isDaily
        ? `Completaste tus ${total} preguntas del repaso diario. Volvé mañana para mantener el ritmo.`
      : `Terminaste ${total} preguntas del banco. Usá los errores como guía para tu próximo repaso.`;
    const badge = document.querySelector("#result-badge");
    badge.textContent = isSimulation
      ? (passed ? "APROBADO · 75% o más" : "A seguir practicando · menos de 75%")
      : isDaily
        ? "10 preguntas completadas"
        : "Banco completado";
    badge.className = `result-badge ${isSimulation ? (passed ? "pass" : "fail") : ""}`;
    document.querySelector("#result-correct").textContent = String(correct);
    document.querySelector("#result-wrong").textContent = String(wrong);
    document.querySelector("#result-percent").textContent = `${percent}%`;

    const mistakes = state.pool.filter((question) => !state.answers.get(question.id)?.isCorrect);
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
      item.append(title, answer);
      mistakesList.appendChild(item);
    });
    showView(resultView);
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
    const fakeEvent = { preventDefault() {} };
    document.querySelector(`input[name="scope"][value="${state.config.scope}"]`).checked = true;
    document.querySelector(`input[name="order"][value="${state.config.order}"]`).checked = true;
    chapterSelect.value = state.config.chapter;
    startPractice(fakeEvent);
  }

  function goToSetup() {
    showView(setupView);
    document.querySelector("#setup-title").focus({ preventScroll: true });
  }

  configForm.addEventListener("submit", startPractice);
  checkButton.addEventListener("click", checkAnswer);
  previousButton.addEventListener("click", () => moveQuestion(-1));
  nextButton.addEventListener("click", () => {
    if (state.index === state.pool.length - 1) showResults();
    else moveQuestion(1);
  });
  document.querySelector("#quit-button").addEventListener("click", goToSetup);
  document.querySelector("#restart-button").addEventListener("click", repeatPractice);
  document.querySelector("#new-practice-button").addEventListener("click", goToSetup);
  document.querySelectorAll('input[name="scope"], input[name="order"]').forEach((input) => input.addEventListener("change", updateSetupLabels));
  chapterSelect.addEventListener("change", updateSetupLabels);

  populateChapters();
  updateSetupLabels();
  if (!questions.length) {
    document.querySelector("#setup-title").textContent = "No se pudo cargar el banco de preguntas.";
    configForm.hidden = true;
  }
})();
