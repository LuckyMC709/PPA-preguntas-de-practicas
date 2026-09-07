from __future__ import annotations

import json
import re
from pathlib import Path

from rapidfuzz import fuzz, process

from extract_ppa import (
    best_option_mapping,
    combined_match_score,
    full_match_value,
    match_value,
    parse_current,
    parse_raac,
)


BASE = Path(__file__).resolve().parents[1]


# Answers that are not safely recoverable from a direct match with the older
# RAAC 61.105 bank. Values are zero-based option indexes (0 = a, 1 = b, 2 = c).
MANUAL_ANSWERS = {
    "anac-2-1": 2,
    "anac-2-2": 0,
    "anac-2-3": 2,
    "anac-2-4": 0,
    "anac-2-5": 0,
    "anac-2-6": 2,
    "anac-2-7": 1,
    "anac-2-8": 1,
    "anac-2-9": 0,
    "anac-2-10": 0,
    "anac-2-11": 2,
    "anac-2-12": 2,
    "anac-2-13": 2,
    "anac-2-14": 0,
    "anac-2-15": 1,
    "anac-2-16": 1,
    "anac-2-17": 1,
    "anac-2-18": 0,
    "anac-2-19": 0,
    "anac-2-20": 1,
    "anac-2-21": 2,
    "anac-2-22": 0,
    "anac-2-23": 2,
    "anac-2-24": 1,
    "anac-2-25": 0,
    "anac-2-26": 2,
    "anac-2-27": 2,
    "anac-2-28": 1,
    "anac-2-29": 1,
    "anac-2-30": 2,
    "anac-2-31": 2,
    "anac-2-32": 0,
    "anac-2-33": 2,
    "anac-2-34": 0,
    "anac-2-35": 0,
    "anac-2-36": 0,
    "anac-2-37": 0,
    "anac-2-38": 0,
    "anac-2-39": 1,
    "anac-2-40": 1,
    "anac-2-41": 0,
    "anac-2-42": 1,
    "anac-2-43": 1,
    "anac-2-44": 0,
    "anac-2-45": 1,
    "anac-2-46": 1,
    "anac-3-31": 2,
    "anac-3-32": 2,
    "anac-3-33": 0,
    "anac-3-34": 1,
    "anac-3-35": 2,
    "anac-3-36": 1,
    "anac-3-37": 2,
    "anac-3-38": 2,
    "anac-3-39": 1,
    "anac-3-40": 0,
    "anac-4-6": 2,
    "anac-4-7": 2,
    "anac-4-9": 1,
    "anac-4-11": 2,
    "anac-4-24": 0,
    "anac-4-28": 2,
    "anac-4-29": 1,
    "anac-4-30": 1,
    "anac-5-12": 0,
    "anac-5-17": 2,
    "anac-5-28": 2,
    "anac-5-30": 1,
    "anac-5-33": 2,
    "anac-5-34": 1,
    "anac-5-35": 2,
    "anac-5-39": 0,
    "anac-5-44": 0,
    "anac-6-19": 1,
    "anac-6-31": 1,
    "anac-7-16": 1,
    "anac-8-14": 0,
    "anac-8-16": 2,
    "anac-8-21": 1,
    "anac-8-22": 2,
    "anac-8-26": 2,
    "anac-8-33": 2,
    "anac-8-34": 0,
    "anac-8-35": 2,
}


def figure_references(question: str) -> list[str]:
    references = []
    pattern = r"[Ff]igura\s+(?:[Nn][úu]mero\s*)?(\d+)\s*(?:-\s*(\d+))?"
    for first, second in re.findall(pattern, question):
        references.append(f"{first}-{second}" if second else first)
    return references


def clean_option(option: str) -> str:
    # A couple of page breaks in the official PDF place the next section title
    # at the end of the preceding answer choice.
    option = re.sub(r"\s+Procedimientos y operaciones de aeropuertos.*$", "", option, flags=re.IGNORECASE)
    option = re.sub(r"\s+Gráfico de Componentes de Viento de Frente y Viento Cruzado.*$", "", option, flags=re.IGNORECASE)
    option = re.sub(r"\s+d\)\s*$", "", option, flags=re.IGNORECASE)
    return option.strip()


FIGURE_ASSETS = {
    "1": "figure-assets/fig-01.png",
    "2": "figure-assets/fig-02.png",
    "3": "figure-assets/fig-03.png",
    "4": "figure-assets/fig-04.png",
    "6": "figure-assets/fig-06.png",
    "7": "figure-assets/fig-07.png",
    "8": "figure-assets/fig-08.png",
    "9": "figure-assets/fig-09.png",
    "29": "figure-assets/fig-29.png",
    "30": "figure-assets/fig-30.png",
    "31": "figure-assets/fig-31.png",
    "37": "figure-assets/fig-37.png",
    "5-4": "figure-assets/fig-5-4.png",
    "63": "figure-assets/fig-63.png",
    "67": "figure-assets/fig-67.png",
}


FIGURE_PAGES = {
    "1": 1,
    "2": 1,
    "3": 2,
    "4": 2,
    "6": 3,
    "7": 4,
    "8": 5,
    "9": 6,
    "29": 6,
    "30": 7,
    "31": 7,
    "37": 14,
    "5-4": 17,
    "63": 21,
    "67": 24,
}


def answer_key(current: list[dict], raac: list[dict]) -> tuple[dict[str, int], dict[str, str]]:
    values = [match_value(item) for item in raac]
    full_values = {full_match_value(item): item for item in raac}
    answers: dict[str, int] = {}
    provenance: dict[str, str] = {}
    for question in current:
        if question["id"] in MANUAL_ANSWERS:
            answers[question["id"]] = MANUAL_ANSWERS[question["id"]]
            provenance[question["id"]] = "ANAC · teoría y análisis / revisión manual"
            continue

        exact = full_values.get(full_match_value(question))
        if exact is not None:
            answers[question["id"]] = exact["correct"]
            provenance[question["id"]] = "ANAC · banco RAAC 61.105"
            continue

        candidates = process.extract(match_value(question), values, scorer=fuzz.ratio, limit=12)
        score, matched = max(
            (
                (combined_match_score(question, raac[index]) / 100, raac[index])
                for _, _, index in candidates
            ),
            key=lambda item: item[0],
        )
        option_score, mapping = best_option_mapping(question, matched)
        if option_score < 95:
            raise ValueError(
                f"No hay una respuesta segura para {question['id']} "
                f"(match={score:.3f}, opciones={option_score:.1f})"
            )
        answers[question["id"]] = mapping.index(matched["correct"])
        provenance[question["id"]] = "ANAC · banco RAAC 61.105 (coincidencia)"
    return answers, provenance


def build() -> list[dict]:
    current = parse_current(BASE / "preguntas-ppa.pdf")
    raac = parse_raac(BASE / "preguntas-raac-61-105.pdf")
    answers, provenance = answer_key(current, raac)
    output: list[dict] = []
    for question in current:
        options = [clean_option(option) for option in question["options"] if option.strip()]
        refs = figure_references(question["question"])
        primary_ref = refs[0] if refs else None
        output.append(
            {
                "id": question["id"],
                "chapter": question["chapter"],
                "chapterName": question["chapterName"],
                "number": question["number"],
                "question": question["question"],
                "options": options,
                "correct": answers[question["id"]],
                "hasFigure": bool(refs),
                "figureRefs": refs,
                "figureAsset": FIGURE_ASSETS.get(primary_ref),
                "figurePage": FIGURE_PAGES.get(primary_ref),
                "answerSource": provenance[question["id"]],
            }
        )
    return output


def main() -> None:
    questions = build()
    payload = "window.PPA_QUESTIONS = " + json.dumps(questions, ensure_ascii=False, indent=2) + ";\n"
    (BASE / "questions.js").write_text(payload, encoding="utf-8")
    counts: dict[int, int] = {}
    for question in questions:
        counts[question["chapter"]] = counts.get(question["chapter"], 0) + 1
    print(f"generated={len(questions)} questions.js")
    print(f"chapters={counts}")
    print(f"manual_or_overrides={len(MANUAL_ANSWERS)}")
    print(f"two_option_questions={[q['id'] for q in questions if len(q['options']) == 2]}")


if __name__ == "__main__":
    main()
