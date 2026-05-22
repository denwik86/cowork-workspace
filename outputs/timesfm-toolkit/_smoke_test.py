"""Smoke-test для forecast.py.

Не качает 500M-модель — заменяет load_model() на синтетический «прогнозист»,
чтобы проверить весь pipeline (чтение Excel -> прогноз -> запись Excel + графики).

Использовать ТОЛЬКО для верификации структуры скрипта, не для реальных прогнозов.
"""
import sys, types, numpy as np
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
import forecast as F  # noqa: E402

class _FakeModel:
    def forecast(self, inputs, freq):
        outs_point, outs_q = [], []
        for arr in inputs:
            # Прогноз: последнее значение + лёгкий тренд + шум
            base = arr[-1]
            trend = (arr[-1] - arr[max(0, len(arr) - 12)]) / 12
            h = 128  # внутренний горизонт TimesFM
            point = base + trend * np.arange(1, h + 1)
            # Квантили: 10 столбцов (mean + 9 квантилей)
            q = np.zeros((h, 10))
            q[:, 0] = point                    # mean
            for i, level in enumerate([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]):
                spread = 0.05 + 0.01 * i
                q[:, i + 1] = point * (1 + spread * (level - 0.5) * 2)
            outs_point.append(point); outs_q.append(q)
        return outs_point, outs_q

def _fake_loader():
    print("[smoke] using FAKE model (no weights downloaded)")
    return _FakeModel()

# Monkey-patch
F.load_model = _fake_loader

# Прогоняем main() с argv
sys.argv = ["forecast.py", "--input", str(HERE / "sample_data.xlsx"),
            "--sheet", "Revenue", "--horizon", "12", "--freq", "M",
            "--output", str(HERE / "smoke_out.xlsx")]
F.main()

# Проверяем результат
import pandas as pd
out = HERE / "smoke_out.xlsx"
assert out.exists(), "Excel не создан"
xl = pd.ExcelFile(out)
print(f"[smoke] листы: {xl.sheet_names}")
assert set(["History", "Forecast", "History+Forecast", "Charts"]).issubset(set(xl.sheet_names))

fc = pd.read_excel(out, sheet_name="Forecast")
print(f"[smoke] Forecast shape: {fc.shape}, cols: {list(fc.columns)[:6]}...")
assert len(fc) == 12, f"ожидалось 12 строк прогноза, получено {len(fc)}"
needed_cols = ["Mila_MRR_P10", "Mila_MRR_P50", "Mila_MRR_P90"]
for c in needed_cols:
    assert c in fc.columns, f"нет колонки {c}"

print("\n[smoke] ✅ Все проверки пройдены. Структура и pipeline корректны.")
