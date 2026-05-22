#!/usr/bin/env bash
# TimesFM Toolkit — installer for macOS (Apple Silicon: M1/M2/M3/M4)
# -----------------------------------------------------------------------------
# Что делает:
#   1) Проверяет наличие Python 3.10/3.11 (TimesFM 1.x требует именно их).
#   2) Создаёт изолированный virtualenv в ./venv (никакой грязи в системе).
#   3) Ставит torch (с поддержкой Apple MPS), TimesFM 1.3.0 и хелперы для Excel.
#   4) Прогревает модель, чтобы при первом запуске не было сюрпризов.
#
# Запуск:
#   chmod +x install.sh && ./install.sh
# -----------------------------------------------------------------------------

set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
say()  { echo -e "${GREEN}[timesfm-install]${NC} $*"; }
warn() { echo -e "${YELLOW}[timesfm-install]${NC} $*"; }
die()  { echo -e "${RED}[timesfm-install]${NC} $*" >&2; exit 1; }

# 1. Проверка платформы --------------------------------------------------------
OS="$(uname -s)"; ARCH="$(uname -m)"
say "OS=$OS ARCH=$ARCH"
if [[ "$OS" != "Darwin" ]]; then
  warn "Скрипт оптимизирован под macOS. На Linux работать будет, но MPS-ускорения не получите."
fi

# 2. Поиск подходящего Python (TimesFM 1.x работает на 3.10/3.11) --------------
PY=""
for cand in python3.11 python3.10; do
  if command -v "$cand" >/dev/null 2>&1; then PY="$cand"; break; fi
done
if [[ -z "$PY" ]]; then
  warn "Не нашёл python3.10 или python3.11."
  warn "Установите через Homebrew:  brew install python@3.11"
  die  "Прервано: нужен Python 3.10 или 3.11."
fi
say "Использую интерпретатор: $($PY --version) ($(command -v $PY))"

# 3. Создаём virtualenv --------------------------------------------------------
HERE="$(cd "$(dirname "$0")" && pwd)"
VENV="$HERE/venv"
if [[ ! -d "$VENV" ]]; then
  say "Создаю virtualenv в $VENV"
  "$PY" -m venv "$VENV"
else
  say "Virtualenv уже существует: $VENV"
fi
# shellcheck disable=SC1090
source "$VENV/bin/activate"
python -m pip install --upgrade pip wheel setuptools

# 4. Установка PyTorch (MPS-совместимый билд) ----------------------------------
say "Ставлю PyTorch (Apple Silicon / MPS)"
pip install --upgrade "torch>=2.2,<2.6"

# 5. Установка TimesFM + хелперов ---------------------------------------------
say "Ставлю TimesFM 1.3.0 и хелперы (pandas, openpyxl, matplotlib, huggingface_hub)"
pip install --upgrade \
  "timesfm==1.3.0" \
  "huggingface_hub>=0.24" \
  "pandas>=2.1" \
  "numpy>=1.26,<2.1" \
  "openpyxl>=3.1" \
  "matplotlib>=3.8" \
  "xlsxwriter>=3.2"

# 6. Прогрев: проверяем импорт и кешируем веса --------------------------------
say "Прогрев: проверяю импорт и тяну веса 'google/timesfm-2.0-500m-pytorch' (~1 ГБ, один раз)"
python - <<'PY'
import torch, sys
print(f"torch={torch.__version__}  mps_available={torch.backends.mps.is_available()}")
import timesfm
print(f"timesfm={timesfm.__version__ if hasattr(timesfm, '__version__') else 'ok'}")
# Стягиваем веса заранее, чтобы первый forecast не ждал downloads
from huggingface_hub import snapshot_download
snapshot_download(repo_id="google/timesfm-2.0-500m-pytorch")
print("OK: модель прокеширована")
PY

say "Готово. Активируйте окружение командой:  source venv/bin/activate"
say "Запуск прогноза:                          python forecast.py --help"
