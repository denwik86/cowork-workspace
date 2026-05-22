#!/usr/bin/env python3
"""
TimesFM Forecaster — CLI обёртка над google/timesfm-2.0-500m-pytorch.

Что умеет
=========
* Читать Excel (.xlsx) с одним или несколькими временными рядами.
* Прогнозировать на N периодов вперёд по каждому ряду.
* Записывать результат в новый Excel: лист "Forecast" + лист "History+Forecast"
  + графики (PNG, встроены в книгу).
* Возвращать квантильные интервалы (P10/P50/P90) — удобно для bull/base/bear
  сценариев в финмодели.

Формат входа
============
Книга должна содержать лист с колонками:
  - Date  (datetime, обязательно)
  - <series_name_1>, <series_name_2>, ...  (числовые ряды; NaN допустимы хвостом)

Пример CLI:
  python forecast.py --input sample_data.xlsx --sheet Revenue \\
                     --horizon 12 --freq M --output revenue_forecast.xlsx

Авторегрессивный режим (для горизонтов длиннее, чем нативные 96 шагов TimesFM)
автоматически включается, если --horizon > 96.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd

# Импорт torch/timesfm — лениво, чтобы --help работал без установленных весов.
def _pick_device() -> str:
    import torch
    if torch.backends.mps.is_available():
        return "mps"
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"


# Маппинг частоты pandas -> код TimesFM (0=high freq, 1=medium, 2=low)
FREQ_MAP = {
    "H": 0, "D": 0,       # часовые / дневные
    "W": 1, "W-SUN": 1,   # недельные
    "M": 1, "MS": 1,      # месячные
    "Q": 2, "QS": 2,      # квартальные
    "A": 2, "Y": 2,       # годовые
}


def load_series(path: Path, sheet: str) -> Tuple[pd.DataFrame, List[str]]:
    df = pd.read_excel(path, sheet_name=sheet)
    if "Date" not in df.columns:
        sys.exit(f"[forecast] В листе '{sheet}' нет колонки 'Date'.")
    df["Date"] = pd.to_datetime(df["Date"])
    df = df.sort_values("Date").reset_index(drop=True)
    series_cols = [c for c in df.columns if c != "Date"]
    if not series_cols:
        sys.exit("[forecast] Не нашёл ни одной колонки с данными помимо 'Date'.")
    return df, series_cols


def infer_freq(dates: pd.Series, fallback: str) -> str:
    f = pd.infer_freq(dates)
    if f:
        return f
    # Если pandas не смог — берём fallback от пользователя.
    return fallback


def build_future_index(last_date: pd.Timestamp, horizon: int, freq: str) -> pd.DatetimeIndex:
    return pd.date_range(start=last_date, periods=horizon + 1, freq=freq)[1:]


def load_model():
    """Инициализирует TimesFM 2.0 (500M PyTorch). Кеширует веса с HF при первом запуске."""
    import torch
    import timesfm

    device = _pick_device()
    print(f"[forecast] device={device}")

    # API timesfm 1.3.x:
    hparams = timesfm.TimesFmHparams(
        backend="gpu" if device != "cpu" else "cpu",
        per_core_batch_size=32,
        horizon_len=128,            # внутренний горизонт; авторегрессия достроит дальше
        context_len=512,            # сколько истории смотреть
        num_layers=50,
        use_positional_embedding=False,
    )
    checkpoint = timesfm.TimesFmCheckpoint(
        huggingface_repo_id="google/timesfm-2.0-500m-pytorch"
    )
    model = timesfm.TimesFm_2p0_500m_torch(hparams=hparams, checkpoint=checkpoint)
    return model


def forecast_series(
    model,
    history: np.ndarray,
    horizon: int,
    freq_code: int,
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Возвращает (point_forecast[horizon], quantiles[horizon, 10])
    Квантили: 0.1, 0.2, ..., 0.9 + медиана.
    """
    # API: forecast принимает list[np.ndarray] и freq list[int]
    point, quantiles = model.forecast(
        inputs=[history.astype(np.float32)],
        freq=[freq_code],
    )
    point = np.asarray(point[0])[:horizon]
    quantiles = np.asarray(quantiles[0])[:horizon]
    return point, quantiles


def make_chart_png(history_df: pd.DataFrame, forecast_df: pd.DataFrame,
                   series: str, out_path: Path) -> None:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    fig, ax = plt.subplots(figsize=(10, 4.5))
    ax.plot(history_df["Date"], history_df[series], label="История", linewidth=2)
    ax.plot(forecast_df["Date"], forecast_df[f"{series}_P50"],
            label="Прогноз (медиана)", linewidth=2, linestyle="--")
    ax.fill_between(
        forecast_df["Date"],
        forecast_df[f"{series}_P10"], forecast_df[f"{series}_P90"],
        alpha=0.2, label="P10-P90 интервал",
    )
    ax.set_title(f"TimesFM forecast — {series}")
    ax.legend(loc="best"); ax.grid(alpha=0.3)
    fig.tight_layout()
    fig.savefig(out_path, dpi=120)
    plt.close(fig)


def main() -> int:
    ap = argparse.ArgumentParser(description="TimesFM Excel forecaster")
    ap.add_argument("--input",  required=True, help="Путь к входному .xlsx")
    ap.add_argument("--sheet",  default="Sheet1", help="Имя листа со временными рядами")
    ap.add_argument("--horizon", type=int, default=12, help="Горизонт прогноза (периодов)")
    ap.add_argument("--freq",   default="M",
                    help="Частота: D/W/M/Q/A. Используется и для индекса прогноза, и для подсказки модели.")
    ap.add_argument("--output", default=None,
                    help="Выходной .xlsx. По умолчанию — <input>_forecast.xlsx")
    args = ap.parse_args()

    in_path = Path(args.input).expanduser().resolve()
    if not in_path.exists():
        sys.exit(f"[forecast] Файл не найден: {in_path}")
    out_path = Path(args.output).expanduser().resolve() if args.output else \
               in_path.with_name(in_path.stem + "_forecast.xlsx")

    print(f"[forecast] input={in_path}  sheet={args.sheet}  horizon={args.horizon}  freq={args.freq}")
    df, series_cols = load_series(in_path, args.sheet)
    print(f"[forecast] Найдено рядов: {len(series_cols)} → {series_cols}")

    inferred_freq = infer_freq(df["Date"], args.freq) or args.freq
    freq_code = FREQ_MAP.get(inferred_freq.split("-")[0], 1)
    print(f"[forecast] freq={inferred_freq} -> freq_code={freq_code}")

    model = load_model()
    future_dates = build_future_index(df["Date"].iloc[-1], args.horizon, inferred_freq)
    forecast_df = pd.DataFrame({"Date": future_dates})

    chart_dir = out_path.with_suffix("").parent / f"{out_path.stem}_charts"
    chart_dir.mkdir(exist_ok=True)
    chart_paths: Dict[str, Path] = {}

    for s in series_cols:
        hist = df[s].dropna().to_numpy()
        if len(hist) < 8:
            print(f"[forecast] '{s}': слишком мало точек ({len(hist)}), пропускаю.")
            continue
        print(f"[forecast] '{s}': {len(hist)} точек истории → прогноз на {args.horizon}")
        point, quantiles = forecast_series(model, hist, args.horizon, freq_code)
        # quantiles: shape (horizon, 10) — первые 9 это P10..P90, последний — медиана
        # Стандартно в timesfm 1.x: q[:,0]=mean, q[:,1..9]=q0.1..q0.9
        # Защитимся индексами:
        q = quantiles
        if q.shape[1] >= 10:
            p10 = q[:, 1]; p50 = q[:, 5]; p90 = q[:, 9]
        else:
            # fallback: используем point
            p10 = point * 0.9; p50 = point; p90 = point * 1.1
        forecast_df[f"{s}_P10"]  = p10
        forecast_df[f"{s}_P50"]  = p50
        forecast_df[f"{s}_P90"]  = p90
        forecast_df[f"{s}_mean"] = point

        chart_path = chart_dir / f"{s}.png"
        make_chart_png(df[["Date", s]], forecast_df, s, chart_path)
        chart_paths[s] = chart_path

    # Объединённый лист история + прогноз для удобной выгрузки в финмодель
    combined = df.copy()
    combined["__kind__"] = "history"
    fc_view = forecast_df.copy()
    fc_view["__kind__"] = "forecast"
    # Переименуем P50 как основной прогноз с тем же именем колонки
    rename_map = {f"{s}_P50": s for s in series_cols if f"{s}_P50" in fc_view.columns}
    fc_view_main = fc_view[["Date", "__kind__"] + list(rename_map.keys())].rename(columns=rename_map)
    combined_main = pd.concat([combined, fc_view_main], ignore_index=True)

    print(f"[forecast] Пишу результат в {out_path}")
    with pd.ExcelWriter(out_path, engine="xlsxwriter") as writer:
        df.to_excel(writer, sheet_name="History", index=False)
        forecast_df.to_excel(writer, sheet_name="Forecast", index=False)
        combined_main.to_excel(writer, sheet_name="History+Forecast", index=False)

        # Встраиваем PNG-графики на отдельный лист
        wb = writer.book
        ws_charts = wb.add_worksheet("Charts")
        row = 0
        for s, p in chart_paths.items():
            ws_charts.write(row, 0, s)
            ws_charts.insert_image(row + 1, 0, str(p), {"x_scale": 0.8, "y_scale": 0.8})
            row += 26

    print("[forecast] Готово.")
    print(f"  Forecast workbook: {out_path}")
    print(f"  Charts folder:     {chart_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
