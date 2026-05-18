# Vertical Studio MCP

Локальный MCP-сервер, который даёт Claude в Cowork прямой доступ к:

- **Runway** — генерация вертикальных видеошотов (Gen-4 / Gen-4 Turbo / Veo 3.1 через Runway Pro)
- **ElevenLabs** — синтез реплик и закадрового голоса
- **CapCut manifest** — сборка готовой папки-проекта, которую ты импортируешь в CapCut Desktop одним перетаскиванием

Ключи API живут в **macOS Keychain**, не в чате и не в файлах. Cowork их никогда не видит — у Claude есть только функции `runway_generate_shot`, `elevenlabs_synthesize`, `capcut_build_manifest`, `studio_status`.

---

## Установка (macOS, ~10 минут)

### 1. Поставить зависимости

Если ещё нет Homebrew:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Поставить Python и `uv` (быстрый менеджер пакетов):
```bash
brew install python@3.11 uv
```

### 2. Положить папку себе

Скопируй папку `mcp_server/` в любое постоянное место, например:
```bash
mkdir -p ~/Tools && cp -R /path/to/mcp_server ~/Tools/vertical-studio-mcp
cd ~/Tools/vertical-studio-mcp
```

### 3. Установить пакет

```bash
uv sync
```

`uv` создаст изолированную среду и поставит все зависимости.

### 4. Сохранить ключи в Keychain

```bash
uv run vertical-studio-keys set
```

Скрипт по очереди спросит `RUNWAY_API_KEY` и `ELEVENLABS_API_KEY` (ввод скрытый, как пароль). Ключи уйдут в macOS Keychain под сервисом `vertical-studio-mcp`.

Проверить:
```bash
uv run vertical-studio-keys show
# должно вывести: RUNWAY_API_KEY: set / ELEVENLABS_API_KEY: set
```

Где взять ключи:
- Runway: https://dev.runwayml.com/ → API keys → Create new key (требуется Runway Pro)
- ElevenLabs: https://elevenlabs.io/app/settings/api-keys → Create new key

### 5. Проверить, что сервер запускается

```bash
uv run vertical-studio-mcp
```

Ничего не выведет — это нормально, MCP сервер общается через stdio. Прерви через Ctrl+C.

---

## Подключение к Cowork

В UI Cowork: **Settings → Connectors → Add custom MCP**, заполнить:

- **Name:** Vertical Studio
- **Command:** `uv`
- **Args:** `--directory /Users/<USERNAME>/Tools/vertical-studio-mcp run vertical-studio-mcp`
- **Working dir:** `/Users/<USERNAME>/Tools/vertical-studio-mcp`

Замени `<USERNAME>` на свой логин (узнать: `echo $USER`).

После подключения у Claude появятся 4 новых tool'а. Скажи в чате: «verify studio» — Claude вызовет `studio_status` и подтвердит, что ключи на месте.

---

## Что Claude теперь умеет

| Tool | Когда вызывает | Что делает |
|---|---|---|
| `studio_status` | в начале, для проверки | Показывает, какие ключи доступны и куда пишет файлы. |
| `runway_generate_shot` | после твоего OK на конкретный шот | Берёт ref-картинку + промт, запускает Runway, ждёт готовности, скачивает mp4 в `~/MiniSeriesStudio/output/<series>/<episode>/clips_raw/`. |
| `elevenlabs_list_voices` | при настройке голоса персонажа | Выдаёт список твоих голосов с лейблами. |
| `elevenlabs_synthesize` | после утверждения реплик | Рендерит mp3 в `~/MiniSeriesStudio/output/<series>/<episode>/audio_raw/`. |
| `capcut_build_manifest` | в конце эпизода | Собирает всё в одну папку с пронумерованными клипами, `.srt`-сабами, `voiceover.mp3`, `music.mp3` и `IMPORT.md`. Ты её импортируешь в CapCut одним движением. |

---

## Папка вывода

По умолчанию всё пишется в `~/MiniSeriesStudio/output/<series>/<episode>/`. Переопределить переменной окружения `VSTUDIO_OUTPUT_DIR`. Структура одного эпизода:

```
S1_LAST_SIGNAL/E03/
├── clips_raw/              ← сырые шоты с Runway
├── audio_raw/              ← реплики с ElevenLabs
├── clips/                  ← переименованные, в порядке монтажа (после capcut_build_manifest)
├── audio/                  ← voiceover.mp3, music.mp3
├── thumbnails/             ← ключевые стиллы
├── captions.srt            ← субтитры
├── plan.json               ← машинный план склейки
├── plan.md                 ← человеко-читаемый
└── IMPORT.md               ← инструкция «как импортировать в CapCut»
```

---

## Обновление и отладка

- Обновить ключ: `uv run vertical-studio-keys set RUNWAY_API_KEY`
- Удалить ключ: `uv run vertical-studio-keys delete RUNWAY_API_KEY`
- Локальная отладка сервера: `uv run vertical-studio-mcp` и из другого терминала отправь JSON-RPC — или используй MCP Inspector (`npx @modelcontextprotocol/inspector uv --directory . run vertical-studio-mcp`).

## Лимиты, о которых надо помнить

- **Runway**: задание длится 30–120 секунд на 5-секундный шот. Сервер блокирует поток до завершения. Не запускай больше 4 шотов параллельно — упрёшься в очередь.
- **ElevenLabs Creator** — 100k символов/мес. Хватит на ~5 эпизодов в день при 60-сек ролике с плотной речью.
- **CapCut manifest** не вызывает CapCut напрямую — у потребительского CapCut нет публичного API. Сервер строит самодостаточную папку, которую CapCut Desktop импортирует за 1 минуту.

---

## Лицензия и безопасность

Код — твой, делай с ним что хочешь. Ключи хранятся в Keychain, к которым имеет доступ только твой пользователь macOS. Cowork сессия видит только результаты вызовов MCP-функций, а не сами ключи.
