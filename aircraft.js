(() => {
  "use strict";

  const material = Array.isArray(window.PA28_MATERIAL) ? window.PA28_MATERIAL : [];
  const questions = Array.isArray(window.PA28_REVIEW_QUESTIONS) ? window.PA28_REVIEW_QUESTIONS : [];
  const letters = ["A", "B", "C", "D"];
  const topicLabels = {
    all: "Repaso mixto",
    normal: "Checklist normal",
    emergency: "Emergencias",
    reference: "Referencias rápidas",
  };
  const aircraftLibrary = document.querySelector("#aircraft-library");
  const quizPanel = document.querySelector("#aircraft-quiz-panel");
  const resultPanel = document.querySelector("#aircraft-result-panel");
  const materialLibrary = document.querySelector("#material-library");
  const aircraftOptions = document.querySelector("#aircraft-options");
  const checkButton = document.querySelector("#aircraft-check-button");
  const previousButton = document.querySelector("#aircraft-previous-button");
  const nextButton = document.querySelector("#aircraft-next-button");
  const feedback = document.querySelector("#aircraft-feedback");
  const feedbackIcon = document.querySelector("#aircraft-feedback-icon");
  const feedbackTitle = document.querySelector("#aircraft-feedback-title");
  const feedbackText = document.querySelector("#aircraft-feedback-text");
  const answeredLabel = document.querySelector("#aircraft-answered-label");

  const state = {
    pool: [],
    index: 0,
    pending: null,
    answers: new Map(),
    topic: "all",
  };

  function shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function correctCount() {
    return [...state.answers.values()].filter((answer) => answer.isCorrect).length;
  }

  function currentQuestion() {
    return state.pool[state.index];
  }

  function setMode(mode) {
    aircraftLibrary.hidden = mode !== "library";
    quizPanel.hidden = mode !== "quiz";
    resultPanel.hidden = mode !== "result";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setOptionButtons(selectedIndex = null, locked = false) {
    [...aircraftOptions.querySelectorAll(".option-button")].forEach((button) => {
      const optionIndex = Number(button.dataset.optionIndex);
      button.classList.toggle("selected", optionIndex === selectedIndex && !locked);
      button.classList.toggle("locked", locked);
      button.setAttribute("aria-checked", optionIndex === selectedIndex ? "true" : "false");
    });
  }

  function renderOptions(question, savedAnswer = null) {
    aircraftOptions.replaceChildren();
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
      aircraftOptions.appendChild(button);
    });

    if (savedAnswer) {
      const buttons = [...aircraftOptions.querySelectorAll(".option-button")];
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
    feedback.hidden = false;
    feedback.classList.toggle("is-correct", savedAnswer.isCorrect);
    feedback.classList.toggle("is-incorrect", !savedAnswer.isCorrect);
    feedbackIcon.textContent = savedAnswer.isCorrect ? "✓" : "!";
    feedbackTitle.textContent = savedAnswer.isCorrect ? "Respuesta correcta" : "Para revisar";
    feedbackText.textContent = savedAnswer.isCorrect
      ? `Muy bien. ${question.explanation}`
      : `La correcta es ${letters[question.correct]}) ${question.options[question.correct]}. ${question.explanation}`;
  }

  function renderQuestion() {
    const question = currentQuestion();
    if (!question) return;
    const savedAnswer = state.answers.get(question.id) || null;
    state.pending = null;

    document.querySelector("#aircraft-topic-label").textContent = topicLabels[state.topic];
    document.querySelector("#aircraft-source-label").textContent = "Material del aeroclub";
    document.querySelector("#aircraft-question-number").textContent = `Repaso ${state.index + 1}`;
    document.querySelector("#aircraft-question").textContent = question.question;
    document.querySelector("#aircraft-question-source").textContent = `Fuente: ${question.source}`;
    document.querySelector("#aircraft-progress-label").textContent = `Pregunta ${state.index + 1} de ${state.pool.length}`;
    const percent = Math.max(1, Math.round(((state.index + 1) / state.pool.length) * 100));
    document.querySelector("#aircraft-progress-percent").textContent = `${percent}%`;
    document.querySelector("#aircraft-progress-bar").style.width = `${percent}%`;
    document.querySelector("#aircraft-live-score").textContent = `${correctCount()} / ${state.answers.size}`;
    previousButton.disabled = state.index === 0;
    nextButton.textContent = state.index === state.pool.length - 1 ? "Ver resultado →" : "Siguiente →";
    answeredLabel.textContent = savedAnswer ? "Respuesta guardada" : "Respondé para continuar";

    renderOptions(question, savedAnswer);
    if (savedAnswer) {
      renderFeedback(question, savedAnswer);
    } else {
      feedback.hidden = true;
      feedback.classList.remove("is-correct", "is-incorrect");
      checkButton.disabled = true;
    }
  }

  function startReview(topic) {
    const filtered = topic === "all" ? questions : questions.filter((question) => question.topic === topic);
    state.pool = shuffle(filtered)
      .slice(0, Math.min(10, filtered.length))
      .map((question, index) => ({ ...question, id: `pa28-${topic}-${index}` }));
    state.index = 0;
    state.pending = null;
    state.answers = new Map();
    state.topic = topic;
    setMode("quiz");
    renderQuestion();
    document.querySelector("#aircraft-question").focus({ preventScroll: true });
  }

  function checkAnswer() {
    const question = currentQuestion();
    if (!question || state.pending === null || state.answers.has(question.id)) return;
    state.answers.set(question.id, { selected: state.pending, isCorrect: state.pending === question.correct });
    renderQuestion();
    renderFeedback(question, state.answers.get(question.id));
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
    document.querySelector("#aircraft-question").focus({ preventScroll: true });
  }

  function showResults() {
    const total = state.pool.length;
    const correct = correctCount();
    const wrong = total - correct;
    const percent = total ? Math.round((correct / total) * 100) : 0;
    document.querySelector("#aircraft-result-title").textContent = percent >= 75 ? "¡Muy buen repaso!" : "Repaso terminado.";
    document.querySelector("#aircraft-result-summary").textContent = `Completaste el repaso de ${topicLabels[state.topic].toLowerCase()} con ${percent}%. Volvé a mirar las respuestas marcadas para reforzar conceptos.`;
    document.querySelector("#aircraft-result-badge").textContent = `${topicLabels[state.topic]} · ${percent}%`;
    document.querySelector("#aircraft-result-badge").className = `result-badge ${percent >= 75 ? "pass" : "fail"}`;
    document.querySelector("#aircraft-result-correct").textContent = String(correct);
    document.querySelector("#aircraft-result-wrong").textContent = String(wrong);
    document.querySelector("#aircraft-result-percent").textContent = `${percent}%`;

    const mistakes = state.pool.filter((question) => !state.answers.get(question.id)?.isCorrect);
    const mistakesSection = document.querySelector("#aircraft-mistakes-section");
    const mistakesList = document.querySelector("#aircraft-mistakes-list");
    mistakesList.replaceChildren();
    mistakesSection.hidden = mistakes.length === 0;
    document.querySelector("#aircraft-mistakes-count").textContent = `${mistakes.length} para repasar`;
    mistakes.forEach((question) => {
      const item = document.createElement("article");
      item.className = "mistake-item";
      const title = document.createElement("strong");
      title.textContent = question.question;
      const answer = document.createElement("p");
      answer.textContent = `Correcta: ${letters[question.correct]}) ${question.options[question.correct]}`;
      item.append(title, answer);
      mistakesList.appendChild(item);
    });
    setMode("result");
  }

  function renderMaterial() {
    materialLibrary.replaceChildren();
    const groups = [...new Set(material.map((item) => item.group))];
    groups.forEach((group) => {
      const section = document.createElement("section");
      section.className = "material-group";
      const heading = document.createElement("h3");
      heading.textContent = group;
      section.appendChild(heading);
      const grid = document.createElement("div");
      grid.className = "material-grid";

      material.filter((item) => item.group === group).forEach((item) => {
        const card = document.createElement("article");
        card.className = `material-card ${item.private ? "material-card-private" : ""}`;
        if (item.image) {
          const image = document.createElement("img");
          image.src = item.image;
          image.alt = item.title;
          image.loading = "lazy";
          card.appendChild(image);
        }
        const content = document.createElement("div");
        content.className = "material-card-content";
        const meta = document.createElement("div");
        meta.className = "material-meta";
        const type = document.createElement("span");
        type.textContent = item.kind === "image" ? "Imagen" : "PDF";
        meta.appendChild(type);
        if (item.private) {
          const privacy = document.createElement("span");
          privacy.textContent = "Uso interno";
          privacy.className = "private-label";
          meta.appendChild(privacy);
        }
        const title = document.createElement("h4");
        title.textContent = item.title;
        const description = document.createElement("p");
        description.textContent = item.description;
        const link = document.createElement("a");
        link.className = "inline-link";
        link.href = item.file;
        link.target = "_blank";
        link.rel = "noopener";
        link.textContent = item.kind === "image" ? "Abrir imagen ↗" : "Abrir documento ↗";
        content.append(meta, title, description, link);
        card.appendChild(content);
        grid.appendChild(card);
      });
      section.appendChild(grid);
      materialLibrary.appendChild(section);
    });
  }

  function showLibrary() {
    setMode("library");
    document.querySelector("#review-title").focus({ preventScroll: true });
  }

  window.PA28_NAVIGATION = { showLibrary };

  document.querySelector("#aircraft-area-button").addEventListener("click", window.PPA_NAVIGATION.showAircraft);
  document.querySelector("#aircraft-home-button").addEventListener("click", window.PPA_NAVIGATION.showHome);
  document.querySelector("#aircraft-library-button").addEventListener("click", showLibrary);
  document.querySelectorAll(".review-start").forEach((button) => {
    button.addEventListener("click", () => startReview(button.dataset.topic));
  });
  checkButton.addEventListener("click", checkAnswer);
  previousButton.addEventListener("click", () => moveQuestion(-1));
  nextButton.addEventListener("click", () => {
    const question = currentQuestion();
    if (!question || !state.answers.has(question.id)) {
      answeredLabel.textContent = "Primero elegí y comprobá una respuesta";
      return;
    }
    if (state.index === state.pool.length - 1) showResults();
    else moveQuestion(1);
  });
  document.querySelector("#aircraft-restart-button").addEventListener("click", () => startReview(state.topic));
  document.querySelector("#aircraft-new-review-button").addEventListener("click", showLibrary);

  renderMaterial();
})();
