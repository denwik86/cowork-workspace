# Как запустить новый проект — рабочая инструкция

Этот документ — твоя памятка о том, как работать с настроенной инфраструктурой Cowork ↔ GitHub ↔ Lovable. Можешь возвращаться к нему всякий раз когда стартуешь что-то новое.

## Что у тебя уже работает

```
Claude (Cowork)
     │
     │  сохраняет файлы в /mnt/outputs/...
     ▼
Mac: ~/Library/Application Support/Claude/local-agent-mode-sessions/.../outputs/
     │
     │  launchd watcher (10 сек debounce)
     ▼
~/Projects/cowork-workspace  (локальный git-клон)
     │
     │  git push (auto)
     ▼
github.com/denwik86/cowork-workspace
     │
     │  webhook
     ▼
Lovable project  →  live preview rebuilds
```

Локальные команды для диагностики:

```bash
# Посмотреть лог синхронизации
tail -f ~/Library/Logs/cowork-gitsync.log

# Проверить что вотчер активен
launchctl list | grep cowork

# Принудительно запушить сейчас (не ждать 10с)
bash ~/Projects/cowork-workspace/.cowork-sync.sh
```

---

## Сценарий A — новое приложение для Lovable

1. **Скажи Claude:** *"Сделай мне приложение X в папке `apps/<имя-проекта>/`"*
   - Где X = твоя идея (React-дашборд, лендинг, todo-app, что угодно)
   - Имя проекта — короткое, латиницей, без пробелов: `finmodel-dashboard`, `sales-tracker` и т.п.

2. Claude сохранит код в `/mnt/outputs/apps/<имя-проекта>/`

3. Через ~10 секунд код окажется в GitHub: `github.com/denwik86/cowork-workspace/tree/main/apps/<имя-проекта>`

4. **В Lovable:** проект уже подключён к репо. Если ты добавил приложение В НОВОЙ подпапке (например `apps/sales-tracker/`), а Lovable смотрит на корень `apps/`, Lovable увидит изменение и предложит работать с ним.
   - **Альтернатива:** создай отдельный Lovable-проект на каждое приложение, указав Root directory = `apps/<имя-проекта>/`. Это чище, если у тебя будет несколько независимых apps.

5. Дальше Lovable и Claude работают параллельно: оба пушат в один GitHub-репо. Когда правишь код в Lovable → он пушит → Claude видит изменения при следующем чтении. Когда Claude правит → Lovable видит через webhook → пересобирает preview.

**Конфликты редактирования:** Если оба правят один файл одновременно — git может сделать merge conflict. Решается: или дай команду одному из двух (например "Claude, прекрати трогать `apps/sales-tracker/src/App.tsx`, я там работаю через Lovable"), или используй разные подпапки.

---

## Сценарий B — финансовая модель / документ / презентация (без Lovable)

1. **Скажи Claude:** *"Сделай мне финансовую модель / презентацию / документ ..."*

2. Claude сохранит в:
   - `/mnt/outputs/outputs/` — для общих deliverables (xlsx, pdf, docx)
   - `/mnt/outputs/reports/` — для memo, one-pager, аналитики
   - `/mnt/outputs/skills/` — для нового скила

3. Через ~10 секунд файлы окажутся в GitHub в соответствующих папках.

4. Если хочешь поделиться файлом — открой `github.com/denwik86/cowork-workspace`, найди файл, поделись ссылкой. Или скачай напрямую: `curl -O https://raw.githubusercontent.com/denwik86/cowork-workspace/main/outputs/...`

---

## Сценарий C — новый скил Claude

1. **Скажи Claude:** *"Создай новый скил для X"*

2. Claude скажет какие уточнения нужны (тип скила, триггеры, формат вывода), потом построит скил с папками `references/`, `scripts/`, `evals/`, упакует в `.skill` файл.

3. Готовый `.skill` окажется в `/mnt/outputs/skills/<имя-скила>.skill` → автоматом запушится в GitHub.

4. **Чтобы скил начал работать в Cowork:** скачай `.skill` из GitHub-репо, открой Claude → Settings → Skills → Install from file → выбери файл. Cowork подхватит скил, и он начнёт триггериться на свои ключевые слова в будущих чатах.

---

## Структура папок в репо

```
cowork-workspace/
├── apps/              ← Веб-приложения (Lovable читает)
│   ├── <project-1>/
│   └── <project-2>/
├── skills/            ← Claude-скилы (.skill + исходники)
├── outputs/           ← Общие deliverables (xlsx, docx, pdf, и т.д.)
├── reports/           ← Memos, one-pager, аналитика
├── README.md
├── .gitignore
└── .cowork-sync.sh    ← Сам скрипт синхронизации
```

**Важно:** Не редактируй файлы в `~/Projects/cowork-workspace/` руками — Claude может перезаписать их на следующей синхронизации. Если хочешь что-то изменить вручную:
- Edit через GitHub UI (зайди на репо, правь файл там) — изменения дойдут до Claude когда он в следующий раз прочитает файл
- Через Lovable (для apps/) — тоже OK, Lovable пушит в GitHub
- НЕ через локальный клон — конфликты неизбежны

---

## Команды-шорткаты для Claude

| Что хочешь | Что сказать Claude |
|------------|---------------------|
| Новое приложение | "Сделай приложение `<X>` в `apps/<имя>/`" |
| Финмодель | "Построй финмодель для `<бизнес>`, сохрани в `outputs/`" |
| Презентацию | "Сделай питч-дек для `<тема>` в `reports/`" |
| Новый скил | "Создай скил для `<задача>`, упакуй в `skills/`" |
| Документ | "Подготовь Word-документ `<тема>` в `outputs/`" |
| Проверить sync | "Покажи последние коммиты в GitHub-репо" (через WebFetch) |

---

## Если что-то сломалось

### Sync не работает (файлы не появляются на GitHub)

```bash
# 1. Проверь что вотчер жив
launchctl list | grep cowork

# 2. Если жив — посмотри ошибки
tail -100 ~/Library/Logs/cowork-gitsync.err.log

# 3. Если умер — перезагрузи
launchctl unload ~/Library/LaunchAgents/com.cowork.gitsync.plist
launchctl load ~/Library/LaunchAgents/com.cowork.gitsync.plist

# 4. Запусти sync вручную чтобы увидеть ошибку напрямую
bash ~/Projects/cowork-workspace/.cowork-sync.sh
```

### GitHub просит снова авторизоваться

```bash
gh auth refresh -s repo,workflow
```

### Хочу остановить auto-sync временно

```bash
launchctl unload ~/Library/LaunchAgents/com.cowork.gitsync.plist
```

Чтобы включить обратно:

```bash
launchctl load ~/Library/LaunchAgents/com.cowork.gitsync.plist
```

### Хочу совсем снести синхронизацию

```bash
launchctl unload ~/Library/LaunchAgents/com.cowork.gitsync.plist
rm ~/Library/LaunchAgents/com.cowork.gitsync.plist
# Локальный репо и GitHub оставляем — это твои данные
```

---

## Lovable-side

После того как ты подключишь репо `denwik86/cowork-workspace` к Lovable:

- **Создание нового приложения в Lovable:** New Project → пиши промпт что хочешь построить → Lovable пушит в твой GitHub-репо в `apps/<сгенерированное-имя>/`
- **Импорт существующего:** New Project → Import from GitHub → выбери репо → укажи Root directory как `apps/<имя>/`
- **Live preview:** каждый раз когда меняется код в `apps/`, Lovable пересобирает preview (≈30 сек)
- **Связь обратно:** правки которые ты делаешь в Lovable UI попадают в GitHub → ко мне через sync

Чтобы Lovable и Claude не дрались за один файл — договоритесь о роли: например Claude генерирует backend / data layer, Lovable работает над UI/UX. Или Claude делает первую итерацию проекта, Lovable допиливает дизайн.

---

## Контрольный список первого запуска нового проекта

- [ ] Решил какой тип проекта (app, model, deck, skill, doc)
- [ ] Придумал короткое латинское имя проекта
- [ ] Сказал Claude где сохранить (apps/skills/outputs/reports)
- [ ] Проверил что файлы появились в `~/Projects/cowork-workspace/`
- [ ] Если это app для Lovable — проверил что в Lovable preview обновился
- [ ] Если это скил — установил `.skill` в Cowork через Settings → Skills
- [ ] Если это документ для шаринга — взял raw-link с GitHub

Готово.
