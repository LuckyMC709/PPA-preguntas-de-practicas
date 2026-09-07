from __future__ import annotations

import json
import re
import sys
import unicodedata
from pathlib import Path

from pypdf import PdfReader
from rapidfuzz import process, fuzz


BASE = Path(__file__).resolve().parents[1]


def pdf_text(path: Path) -> str:
    return "\n".join((page.extract_text() or "") for page in PdfReader(str(path)).pages)


def normalize_text(value: str) -> str:
    value = value.replace("\u00a0", " ").replace("–", "-").replace("—", "-")
    value = unicodedata.normalize("NFKD", value)
    value = "".join(char for char in value if not unicodedata.combining(char))
    value = value.casefold()
    value = re.sub(r"\bfigura\s*(?:n[uú]mero\s*)?\d+\b", "figura", value)
    value = re.sub(r"\s+", " ", value)
    return re.sub(r"[^a-z0-9]+", " ", value).strip()


def join_lines(lines: list[str]) -> str:
    return re.sub(r"\s+", " ", " ".join(line.strip() for line in lines if line.strip())).strip()


def is_page_header(line: str) -> bool:
    compact = re.sub(r"\s+", " ", line.strip())
    folded = compact.casefold()
    return (
        folded in {
            "anac",
            "dirección nacional de seguridad operacional",
            "dirección licencias al personal",
            "dto. control educativo",
            "piloto privado avión",
            "preguntas",
            "dirección nacional de seguridad operacional",
            "dirección de licencias al personal",
        }
        or bool(re.fullmatch(r"P[áa]gina \d+ de \d+", compact, flags=re.IGNORECASE))
        or bool(re.fullmatch(r"p[áa]gina \d+ / \d+", compact, flags=re.IGNORECASE))
        or bool(re.fullmatch(r"PREGUNTAS\s+P[áa]gina \d+ de \d+", compact, flags=re.IGNORECASE))
    )


def is_section_heading(line: str) -> bool:
    folded = re.sub(r"\s+", " ", line.strip()).casefold()
    return folded in {
        "señales del aeropuerto",
        "indicador visual de pendiente de aproximación (vasi)",
        "operaciones en tierra",
        "aptitud para el vuelo",
        "toma de decisiones aeronáuticas",
        "evitar colisiones",
    }


def parse_current(path: Path) -> list[dict]:
    questions: list[dict] = []
    chapter_number = None
    chapter_name = None
    current: dict | None = None
    option_index: int | None = None

    for page in PdfReader(str(path)).pages:
        lines = (page.extract_text() or "").splitlines()
        for raw in lines:
            line = raw.strip()
            if not line or is_page_header(line) or is_section_heading(line):
                continue
            chapter = re.match(r"CAP[ÍI]TULO\s+(\d+)\s*:\s*(.+)", line, flags=re.IGNORECASE)
            if chapter:
                chapter_number = int(chapter.group(1))
                chapter_name = join_lines([chapter.group(2)])
                continue
            start = re.match(r"^(\d+)\s*[-.]+\s*(.*)$", line)
            if start and chapter_number is not None:
                if current is not None:
                    current["question"] = join_lines(current.pop("_stem"))
                    current["options"] = [join_lines(option) for option in current.pop("_options")]
                    questions.append(current)
                current = {
                    "source": "ANAC · Preguntas de todos los capítulos",
                    "chapter": chapter_number,
                    "chapterName": chapter_name,
                    "number": int(start.group(1)),
                    "_stem": [start.group(2)],
                    "_options": [[], [], []],
                }
                option_index = None
                continue
            option = re.match(r"^([a-cA-C])\)\s*(.*)$", line)
            if current is None:
                continue
            if option:
                option_index = ord(option.group(1).lower()) - ord("a")
                if option_index == 0 and current["_options"][0] and current["_options"][1]:
                    option_index = 2
                if option_index < len(current["_options"]):
                    current["_options"][option_index].append(option.group(2))
                continue
            if option_index is None:
                current["_stem"].append(line)
            else:
                current["_options"][option_index].append(line)

    if current is not None:
        current["question"] = join_lines(current.pop("_stem"))
        current["options"] = [join_lines(option) for option in current.pop("_options")]
        questions.append(current)

    for question in questions:
        question["id"] = f"anac-{question['chapter']}-{question['number']}"
    return questions


def parse_raac(path: Path) -> list[dict]:
    lines = (pdf_text(path)).splitlines()
    starts = [i for i, line in enumerate(lines) if re.fullmatch(r"\s*\d+\s+S\s+1\s*", line)]
    questions: list[dict] = []
    for position, start in enumerate(starts):
        end = starts[position + 1] if position + 1 < len(starts) else len(lines)
        block = [
            line.strip()
            for line in lines[start + 1 : end]
            if not is_page_header(line)
            and not re.fullmatch(r"Azopardo 1405|Capital Federal", line.strip(), flags=re.IGNORECASE)
        ]
        marker_positions = [
            i for i, line in enumerate(block)
            if re.fullmatch(r"\s*[123]\s+(?:\*)?\s*[123]\s*", line)
        ]
        if len(marker_positions) < 3:
            continue
        stem = join_lines(block[: marker_positions[0]])
        stem = re.sub(r"^(?:PPA\s+)?\d{1,3}\s*[-.]+\s*", "", stem, flags=re.IGNORECASE)
        options: list[str] = []
        correct = None
        for index, marker_position in enumerate(marker_positions[:3]):
            marker = block[marker_position]
            if "*" in marker:
                correct = index
            limit = marker_positions[index + 1] if index + 1 < len(marker_positions[:3]) else len(block)
            option_lines = block[marker_position + 1 : limit]
            label_position = None
            for j, option_line in enumerate(option_lines):
                if re.match(r"^[a-cA-C][\).]\s*", option_line):
                    label_position = j
                    break
            if label_position is None:
                options.append(join_lines(option_lines))
            else:
                options.append(join_lines(option_lines[label_position:]))
        options = [re.sub(r"^[a-cA-C][\).]\s*", "", value).strip() for value in options]
        if not stem or len(options) != 3 or correct is None:
            continue
        questions.append({
            "source": "ANAC · Preguntas RAAC 61.105",
            "raacNumber": int(re.match(r"\s*(\d+)", lines[start]).group(1)),
            "question": stem,
            "options": options,
            "correct": correct,
        })
    for index, question in enumerate(questions, start=1):
        question["id"] = f"raac-{index}"
    return questions


def match_value(question: dict) -> str:
    return normalize_text(question["question"])


def full_match_value(question: dict) -> str:
    return normalize_text(question["question"] + " " + " ".join(question["options"]))


def option_match_score(left: dict, right: dict) -> float:
    return best_option_mapping(left, right)[0]


def best_option_mapping(left: dict, right: dict) -> tuple[float, tuple[int, int, int]]:
    left_options = [normalize_text(value) for value in left["options"]]
    right_options = [normalize_text(value) for value in right["options"]]
    scores = []
    for permutation in (
        (0, 1, 2), (0, 2, 1), (1, 0, 2),
        (1, 2, 0), (2, 0, 1), (2, 1, 0),
    ):
        scores.append((sum(fuzz.ratio(left_options[i], right_options[permutation[i]]) for i in range(3)) / 3, permutation))
    return max(scores, key=lambda item: item[0])


def combined_match_score(left: dict, right: dict) -> float:
    stem_score = fuzz.ratio(match_value(left), match_value(right))
    return 0.58 * stem_score + 0.42 * option_match_score(left, right)


def main() -> None:
    current = parse_current(BASE / "preguntas-ppa.pdf")
    raac = parse_raac(BASE / "preguntas-raac-61-105.pdf")
    print(f"current={len(current)} raac={len(raac)}")
    values = [match_value(right) for right in raac]
    full_values = {full_match_value(right): right for right in raac}
    matches = []
    exact = []
    all_matches = []
    for left in current:
        exact_right = full_values.get(full_match_value(left))
        if exact_right is not None:
            exact.append((left, exact_right))
        candidates = process.extract(match_value(left), values, scorer=fuzz.ratio, limit=12)
        score, right = max(
            ((combined_match_score(left, raac[index]) / 100, raac[index]) for _, _, index in candidates),
            key=lambda item: item[0],
        )
        option_score, mapping = best_option_mapping(left, right)
        all_matches.append((score, option_score / 100, mapping, left, right))
        if score >= 0.72:
            matches.append((score, left, right))
    print(f"matches>=.72={len(matches)}")
    print(f"exact full matches={len(exact)}")
    print(f"unique raac exact targets={len({right['id'] for _, right in exact})}")
    print("thresholds", {threshold: sum(score >= threshold for score, _, _ in matches) for threshold in [0.75, 0.8, 0.85, 0.9, 0.95]})
    auto = []
    exact_ids = {left["id"] for left, _ in exact}
    for score, option_score, mapping, left, right in all_matches:
        if full_match_value(left) in full_values or option_score >= 0.95:
            auto.append(left["id"])
            if left["id"] not in exact_ids:
                current_correct = mapping.index(right["correct"])
                print(f"FUZZY AUTO {left['id']} -> {right['id']} score={score:.3f} opt={option_score:.3f} correct={current_correct} | {left['question']}")
    print(f"auto answer candidates={len(auto)}; manual={len(current) - len(auto)}")
    print("manual ids", [question["id"] for question in current if question["id"] not in auto])
    print("LOW / AMBIGUOUS MATCHES")
    for score, option_score, mapping, left, right in sorted(all_matches, key=lambda item: item[0]):
        if score < 0.90 or option_score < 0.90:
            print(f"{score:.3f} opt={option_score:.3f} map={mapping} {left['id']} -> {right['id']} correct={right['correct']} | {left['question']} | {left['options']}")
    for score, left, right in sorted(matches, key=lambda item: item[0])[:30]:
        print(f"{score:.3f} {left['id']} -> {right['id']} | {left['question'][:90]} | {right['question'][:90]}")
    print("current invalid", [(q["id"], len(q["options"]), q["question"][:60]) for q in current if len(q["options"]) != 3][:20])
    print("raac invalid", [(q.get("raacNumber"), len(q["options"]), q["question"][:60]) for q in raac if len(q["options"]) != 3][:20])


if __name__ == "__main__":
    main()
