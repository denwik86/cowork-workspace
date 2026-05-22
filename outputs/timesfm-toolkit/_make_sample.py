"""Генератор sample_data.xlsx — два листа с реалистичными рядами.

Лист 'Revenue'  — месячная выручка SaaS-компании (тренд + сезонность + шум),
                  60 точек = 5 лет истории.
Лист 'Macro'    — два макро-ряда: курс EUR/USD и индекс цен (CPI).
"""
import numpy as np, pandas as pd
from pathlib import Path

OUT = Path(__file__).with_name("sample_data.xlsx")
rng = np.random.default_rng(42)

# --- Revenue ---------------------------------------------------------------
months = pd.date_range("2020-01-01", periods=60, freq="MS")
trend = np.linspace(1_000_000, 4_500_000, len(months))
season = 250_000 * np.sin(2 * np.pi * (months.month - 1) / 12)
noise = rng.normal(0, 120_000, len(months))
revenue = trend + season + noise
# Mila — основной продукт (доминирует), Side — небольшая линия с другим паттерном
mila = revenue
side = 0.15 * revenue + rng.normal(0, 60_000, len(months))
rev_df = pd.DataFrame({"Date": months, "Mila_MRR": mila.round(0), "Side_revenue": side.round(0)})

# --- Macro -----------------------------------------------------------------
days = pd.date_range("2023-01-01", periods=520, freq="D")  # ~17 месяцев дневной истории
eur_usd = 1.07 + 0.04 * np.sin(np.linspace(0, 6 * np.pi, len(days))) + rng.normal(0, 0.005, len(days))
cpi = 100 + np.cumsum(rng.normal(0.02, 0.05, len(days)))
macro_df = pd.DataFrame({"Date": days, "EURUSD": eur_usd.round(4), "CPI_index": cpi.round(2)})

with pd.ExcelWriter(OUT, engine="xlsxwriter") as w:
    rev_df.to_excel(w,   sheet_name="Revenue", index=False)
    macro_df.to_excel(w, sheet_name="Macro",   index=False)

print(f"OK: {OUT}  Revenue={len(rev_df)} rows, Macro={len(macro_df)} rows")
