#!/usr/bin/env python3
"""
Инфографика: влияние удалённой и гибридной занятости на продуктивность в IT.
Запуск: python generate_infographic.py
"""

import os
from pathlib import Path

# Кэш matplotlib в папке проекта (удобно для CI и ограниченных окружений)
_mpl_dir = Path(__file__).resolve().parent / ".mplconfig"
_mpl_dir.mkdir(parents=True, exist_ok=True)
os.environ.setdefault("MPLCONFIGDIR", str(_mpl_dir))

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
from matplotlib import font_manager

# Цвета блоков (как в задании)
COL_TITLE = "#2563EB"  # синий заголовок
COL_SUB = "#EAB308"  # жёлтый подзаголовок
COL_BLOCK1 = "#22C55E"  # зелёный
COL_BLOCK2 = "#3B82F6"  # синий
COL_PROS = "#16A34A"
COL_CONS = "#DC2626"
COL_HYBRID = "#9333EA"
COL_CASE = "#EA580C"
COL_OUT = "#78350F"

OUT_PATH = Path(__file__).resolve().parent / "infographic_remote_hybrid_it.png"


def add_rounded_box(ax, x, y, width, height, facecolor, edgecolor="#1e293b", linewidth=1.2):
    box = FancyBboxPatch(
        (x, y),
        width,
        height,
        boxstyle="round,pad=0.02,rounding_size=0.015",
        transform=ax.transAxes,
        facecolor=facecolor,
        edgecolor=edgecolor,
        linewidth=linewidth,
        alpha=0.92,
    )
    ax.add_patch(box)


def main():
    fig = plt.figure(figsize=(11, 16), facecolor="#F8FAFC")
    ax = fig.add_axes((0, 0, 1, 1))
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")

    # Шрифты: кириллица (macOS / fallback)
    for p in (
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
    ):
        if Path(p).exists():
            try:
                font_manager.fontManager.addfont(p)
                plt.rcParams["font.family"] = font_manager.FontProperties(fname=p).get_name()
            except Exception:
                plt.rcParams["font.family"] = "DejaVu Sans"
            break
    else:
        plt.rcParams["font.family"] = "DejaVu Sans"

    def txt(x, y, s, *, size=11, weight="normal", color="#0f172a", ha="left", va="top"):
        ax.text(
            x,
            y,
            s,
            fontsize=size,
            fontweight=weight,
            color=color,
            ha=ha,
            va=va,
            wrap=False,
        )

    y = 0.98

    # --- Заголовок ---
    add_rounded_box(ax, 0.04, y - 0.09, 0.92, 0.085, COL_TITLE)
    txt(0.08, y - 0.02, "Влияние удалённой и гибридной занятости\nна продуктивность в IT", size=17, weight="bold", color="white")
    y -= 0.11

    # --- Подзаголовок ---
    add_rounded_box(ax, 0.04, y - 0.045, 0.92, 0.04, COL_SUB)
    txt(0.08, y - 0.012, "Кейс-стади (качественное исследование)", size=13, weight="bold", color="#422006")
    y -= 0.055

    # --- Блок 1 и 2 в два столбца ---
    col_w = 0.44
    h1 = 0.14
    add_rounded_box(ax, 0.04, y - h1, col_w, h1 - 0.01, COL_BLOCK1)
    txt(0.07, y - 0.02, "Блок 1 — Что изучаем", size=12, weight="bold", color="white")
    txt(
        0.07,
        y - 0.05,
        "Объект исследования:\n\n• IT-команды\n• Удалённая работа\n• Гибридная модель",
        size=10,
        color="#14532D",
    )

    add_rounded_box(ax, 0.52, y - h1, col_w, h1 - 0.01, COL_BLOCK2)
    txt(0.55, y - 0.02, "Блок 2 — Исследовательский вопрос", size=12, weight="bold", color="white")
    txt(
        0.55,
        y - 0.055,
        "Как удалённая и гибридная работа\nвлияет на продуктивность?",
        size=11,
        weight="bold",
        color="#172554",
    )
    y -= h1 + 0.01

    # --- Плюсы / минусы ---
    h2 = 0.22
    add_rounded_box(ax, 0.04, y - h2, col_w, h2 - 0.01, COL_PROS)
    txt(0.07, y - 0.02, "Блок 3 — Преимущества", size=12, weight="bold", color="white")
    pros = (
        "✓  Экономия времени\n"
        "✓  Гибкость работы\n"
        "✓  Доступ к специалистам\n"
        "✓  Баланс работа / жизнь\n"
        "✓  Рост продуктивности"
    )
    txt(0.07, y - 0.05, pros, size=10, color="#052E16")

    add_rounded_box(ax, 0.52, y - h2, col_w, h2 - 0.01, COL_CONS)
    txt(0.55, y - 0.02, "Блок 4 — Недостатки", size=12, weight="bold", color="white")
    cons = (
        "✗  Снижение коммуникации\n"
        "✗  Проблемы с концентрацией\n"
        "✗  Чувство изоляции\n"
        "✗  Сложность управления\n"
        "✗  Возможное снижение контроля"
    )
    txt(0.55, y - 0.05, cons, size=10, color="#450A0A")
    y -= h2 + 0.01

    # --- Гибрид ---
    h3 = 0.16
    add_rounded_box(ax, 0.04, y - h3, 0.92, h3 - 0.01, COL_HYBRID)
    txt(0.07, y - 0.02, "Блок 5 — Гибридная модель", size=12, weight="bold", color="white")
    hybrid = (
        "Формат:\n"
        "  Офис: 2–3 дня          Дом: 2–3 дня\n\n"
        "Особенности:\n"
        "  • Баланс гибкости и контроля\n"
        "  • Требует координации"
    )
    txt(0.07, y - 0.05, hybrid, size=10, color="#FAF5FF")
    y -= h3 + 0.01

    # --- Кейс-стади ---
    h4 = 0.14
    add_rounded_box(ax, 0.04, y - h4, 0.92, h4 - 0.01, COL_CASE)
    txt(0.07, y - 0.02, "Блок 6 — Почему кейс-стади", size=12, weight="bold", color="white")
    case = (
        "•  Глубокий анализ     •  Реальные данные     •  Гибкость методов\n"
        "•  Подходит для малого исследования"
    )
    txt(0.07, y - 0.05, case, size=10, color="#431407")
    y -= h4 + 0.01

    # --- Вывод ---
    h5 = 0.12
    add_rounded_box(ax, 0.04, y - h5, 0.92, h5 - 0.01, COL_OUT)
    txt(0.07, y - 0.02, "Блок 7 — Вывод", size=12, weight="bold", color="#FEF3C7")
    out = (
        "• Формат работы влияет на продуктивность\n"
        "• Есть как плюсы, так и минусы\n"
        "• Важна грамотная организация процессов"
    )
    txt(0.07, y - 0.05, out, size=11, color="#FFFBEB")

    fig.savefig(OUT_PATH, dpi=200, facecolor=fig.get_facecolor(), bbox_inches="tight")
    print(f"Сохранено: {OUT_PATH}")


if __name__ == "__main__":
    main()
