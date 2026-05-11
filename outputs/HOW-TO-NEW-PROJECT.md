# Как работать с пайплайном Cowork → GitHub → Lovable

Последнее обновление: 11 мая 2026

## Архитектура (финальная)

У тебя теперь **два независимых пайплайна** под одним GitHub аккаунтом `denwik86`:

```
┌──────────────────────────────┐
│ Cowork (Claude в десктопе)    │
│ создаёт outputs, скилы,       │
│ отчёты, финмодели, документы │
└──────────────┬────────────────┘
               │ launchd watcher
               │ (раз в ~10 секунд)
               ▼
┌──────────────────────────────┐
│ denwik86/cowork-workspace     │  ← репо для всего, что НЕ приложение
│  ├── outputs/                 │     (документы, скилы, отчёты)
│  ├── skills/                  │
│  ├── reports/                 │
│  └── apps/  (опционально)     │
└──────────────────────────────┘


┌──────────────────────────────┐
│ Lovable                       │
│ редактирование, prompt-driven │
│ создание веб-приложений       │
└──────────────┬────────────────┘
               │ Lovable GitHub App
               │ (двусторонняя синхронизация)
               ▼
┌──────────────────────────────┐
│ denwik86/<app-name>           │  ← по отдельному репо на каждое приложение
│  src/, package.json,          │     первый пример: cowork-hello-page
│  vite.config.ts, ...          │
└──────────────────────────────┘
```

**Ключевая идея:** Lovable требует репо в формате Vite/React-приложения (с `package.json` в корне). Поэтому он не может писать в `cowork-workspace` (там скилы, отчёты — другая структура). Каждое Lovable-приложение получает **свой собственный репо**, который Lovable создаёт автоматически при первом подключении.

---

## Сценарий A — Создаю новое веб-приложение (через Lovable)

1. Открываю [lovable.dev](https://lovable.dev)
2. В чате на дашборде пишу промпт: что хочу построить
3. Lovable генерит проект и название (например, `denwik86/my-saas-app`)
4. Кликаю иконку GitHub в правом верхнем углу проекта → **Connect GitHub** → **Add connection**
5. Lovable сам создаёт **отдельный приватный репо** в моём GitHub аккаунте
6. С этого момента двусторонняя синхронизация: правлю в Lovable — летит в GitHub, правлю в GitHub — летит в Lovable

**Где можно работать с приложением вне Lovable:**
- Клонируй репо к себе на Mac: `gh repo clone denwik86/<app-name>`
- Правь файлы любым редактором — изменения попадут в Lovable
- Pull request тоже работают — Lovable их подхватывает

**Пример (что уже есть):** `denwik86/cowork-hello-page` — тестовый Lovable-проект, подключённый к одноимённому репо.

---

## Сценарий B — Создаю модель / документ / отчёт (через Cowork)

1. Открываю Claude desktop, пишу что нужно (например: «построй финмодель для X»)
2. Claude использует соответствующий скил (financial-modeling, docx, xlsx, pptx, и т.д.) и сохраняет финальный файл в **outputs**-папку текущей сессии
3. launchd watcher на Mac замечает новый файл за ~10 секунд
4. Файл автоматически синхронизируется в `denwik86/cowork-workspace/outputs/`
5. Открываю на GitHub или клонирую к себе на Mac (`~/Projects/cowork-workspace`)

**Где можно подсмотреть скилы и старые outputs:**
- На GitHub: [denwik86/cowork-workspace](https://github.com/denwik86/cowork-workspace)
- Локально: `~/Projects/cowork-workspace/`

---

## Сценарий C — Создаю новый скил для Claude

1. В Cowork прошу: «создай скил для X», использую `skill-creator`
2. Claude создаёт папку с `SKILL.md`, `references/`, `scripts/`, `evals/`
3. Финальный `.skill` пакет попадает в outputs → автоматом летит в `cowork-workspace/outputs/`
4. Скачиваю пакет на Mac, импортирую в Claude desktop через Settings → Skills → Install

---

## Сценарий D — Хочу принести Cowork-сгенерированный код в Lovable

Cowork может сгенерировать стартовый код приложения, но Lovable работает только со своим форматом репо. Алгоритм:

1. Cowork генерит код, сохраняю в `outputs/my-app/`
2. На Mac: создаю чистый репо в новой папке, копирую туда сгенерированные файлы, делаю `git init && git add . && git commit -m "initial"`, пушу в новый GitHub репо
3. В Lovable создаю новый проект через промпт «import existing repo» (опция в `+`-меню при создании)
4. Lovable подхватывает мой существующий репо

Это редкий кейс — обычно проще просто описать что хочу в Lovable, чем переносить чужой код.

---

## Структура папок в `cowork-workspace`

```
cowork-workspace/
├── README.md          ← описание репо
├── .gitignore
├── outputs/           ← всё, что Cowork сохраняет в /mnt/outputs/
├── skills/            ← мои custom-скилы (если буду их версионировать)
├── reports/           ← одноразовые большие отчёты/анализы
└── apps/              ← (опционально) стартовый код приложений, до переноса в Lovable
```

---

## Диагностика sync (если что-то не приходит на GitHub)

Открыть терминал и запустить по очереди:

**1. Посмотреть лог launchd watcher (живой стрим):**
```bash
tail -f ~/Library/Logs/cowork-gitsync.log
```
Здесь будут строки типа `[2026-05-11 11:07] synced 3 files` или ошибки.

**2. Проверить, что launchd-агент жив:**
```bash
launchctl list | grep cowork
```
Должно выдать строку с `com.cowork.gitsync` (если PID = `-`, значит агент висит, но не запущен прямо сейчас — это норма между триггерами).

**3. Принудительно запустить sync вручную:**
```bash
bash ~/Projects/cowork-workspace/.cowork-sync.sh
```

**4. Перезагрузить launchd-агент после правок plist:**
```bash
launchctl unload ~/Library/LaunchAgents/com.cowork.gitsync.plist
launchctl load   ~/Library/LaunchAgents/com.cowork.gitsync.plist
```

**5. Обновить GitHub токен (если протух):**
```bash
gh auth refresh -s repo,workflow
```

---

## Lovable: полезные команды и шорткаты

- **Открыть код проекта на GitHub:** иконка GitHub в правом верхнем углу проекта → ссылка
- **Клонировать репо локально:**
  ```bash
  gh repo clone denwik86/<app-name>
  cd <app-name>
  bun install   # Lovable использует Bun (bun.lock есть в репо)
  bun run dev
  ```
- **Двусторонняя sync:** правки в GitHub (через локальные коммиты или PR) автоматически попадают в Lovable preview. Правки в Lovable автоматически коммитятся в GitHub.
- **Branch other than main:** Lovable работает только с веткой `main` для sync; можно ввести фичи в отдельных ветках через GitHub, мержить в main → Lovable их подхватит.

---

## Чек-лист на старте нового проекта

**Если это веб-приложение:**
- [ ] lovable.dev → промпт → проект создан
- [ ] Settings → Git → GitHub → Add connection → подождать пока появится `denwik86/<app-name>` (Connected)
- [ ] Проверить на GitHub что репо появился с коммитом от `lovable-dev[bot]`
- [ ] Если буду править локально: `gh repo clone denwik86/<app-name>` + `bun install`

**Если это документ/модель/отчёт:**
- [ ] Cowork → описать задачу → Claude использует нужный скил
- [ ] Подождать ~10 секунд после завершения генерации
- [ ] Проверить GitHub: `denwik86/cowork-workspace/outputs/` — файл должен появиться
- [ ] Если не появился: открыть лог `tail -f ~/Library/Logs/cowork-gitsync.log`

---

## Текущие репо в твоём GitHub аккаунте

- `denwik86/cowork-workspace` — workspace для Cowork-документов (скилы, отчёты, outputs)
- `denwik86/cowork-hello-page` — первый Lovable-проект (тестовый landing page)
- `denwik86/NBA` — старый проект (бот)
- `denwik86/Dutch` — старый проект (AI агент)

С каждым новым Lovable-проектом будет добавляться отдельный репо.
