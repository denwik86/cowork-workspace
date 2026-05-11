# Memory MCP — установка и первичная база знаний

Это решает проблему "у Claude нет памяти между сессиями". Memory MCP — официальный сервер от Anthropic (`@modelcontextprotocol/server-memory`), который хранит факты в виде knowledge graph в локальном JSON-файле. Claude может писать в него и читать его в любой сессии.

---

## Часть 1. Установка (5 минут)

### Шаг 1. Открой config файл Claude Desktop

На macOS файл лежит здесь:
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

Открой в Finder через **Cmd+Shift+G** → введи путь.
Или в терминале:
```bash
open -e "~/Library/Application Support/Claude/claude_desktop_config.json"
```

### Шаг 2. Добавь memory сервер

Если файл уже содержит блок `mcpServers`, добавь внутрь него:

```json
"memory": {
  "command": "npx",
  "args": [
    "-y",
    "@modelcontextprotocol/server-memory"
  ],
  "env": {
    "MEMORY_FILE_PATH": "/Users/viktar86/Library/Application Support/Claude/memory.json"
  }
}
```

Если файла нет вообще или нет блока `mcpServers`, создай его полностью:

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "env": {
        "MEMORY_FILE_PATH": "/Users/viktar86/Library/Application Support/Claude/memory.json"
      }
    }
  }
}
```

### Шаг 3. Перезапусти Claude Desktop полностью

`Cmd+Q` → запусти заново. Проверь, что сервер подключился: в Settings → Developer должен появиться сервер "memory" со статусом connected.

### Шаг 4. Положи первичную базу (опционально, но рекомендую)

Файл `memory-seed.json` в этом outputs-каталоге — это первичная заготовка фактов о тебе, которые я уже знаю из прошлых сессий (без чувствительной информации). Чтобы её загрузить:

```bash
cp /sessions/charming-great-bell/mnt/outputs/memory-seed.json \
   "/Users/viktar86/Library/Application Support/Claude/memory.json"
```

Или просто открой её и скопируй содержимое в финальный файл.

---

## Часть 2. Как пользоваться

После установки в любой сессии я смогу вызывать:

- `mcp__memory__create_entities` — добавлять новые сущности (проекты, людей, компании)
- `mcp__memory__create_relations` — связывать их
- `mcp__memory__add_observations` — добавлять факты к существующим сущностям
- `mcp__memory__search_nodes` — искать по графу
- `mcp__memory__read_graph` — читать всё

В начале каждой большой задачи можно говорить мне:
> "посмотри в memory что у тебя есть про X" или
> "запомни что …"

И я буду делать запросы автоматически.

---

## Часть 3. Что в первичной базе

Файл `memory-seed.json` содержит:

**Сущности:**
- `Viktar` (person) — твой профиль
- `BVC Capital` (entity) — твоё BV
- `Inburgeringsexamen A2` (project) — экзамен по голландскому, цель август 2026
- `Animaccord / M&B case` (project) — M&A инвест-кейс
- `Project Mila` (project) — pitch для BY компании
- `IB 2025 declaration` (project) — налоговая декларация

**Отношения:**
- Viktar owns BVC Capital
- Viktar studying Inburgeringsexamen A2
- Viktar working on Animaccord case
- Viktar developed Project Mila pitch
- etc.

Это не секретная информация — только структура работы. Чувствительные финансовые цифры (твой winst, личный кэш) НЕ записаны. Memory MCP — это локальный JSON, не отправляется никуда вовне, но как дисциплина: не пиши туда то, что не хочешь, чтобы я когда-нибудь зачитал.

---

## Часть 4. Альтернатива — если memory MCP не зайдёт

Если решишь не ставить, всё равно есть способ дать мне контекст между сессиями:

1. **`/sessions/charming-great-bell/mnt/outputs/CLAUDE.md`** — обычный markdown с фактами о тебе. В каждой новой сессии говори "прочти CLAUDE.md".
2. **GitHub Gist** или приватный репо с CLAUDE.md — можно дать мне ссылку, я прочту через WebFetch.
3. **session_info** инструменты — я могу читать предыдущие сессии через `list_sessions` + `read_transcript` (я это уже использовал в этой беседе).

Memory MCP лучше всего, потому что:
- Структурированно (граф, а не текст)
- Автоматически обновляется по ходу разговора
- Я могу искать по нему точечно, не загружая весь файл в контекст

---

## Часть 5. Безопасность

- Memory MCP хранит ВСЁ в одном JSON-файле локально. Бэкап делай как обычный файл.
- Файл читаемый — открой и посмотри, что внутри в любой момент.
- Для совсем чувствительной информации (пароли, ключи, кэш на счетах) → НЕ записывай в memory. Это рабочая память, не сейф.
