# RSService26 v2

Рабочая структура проекта для запуска сайта и Telegram-бота.

## Структура

```text
web/   Next.js сайт
bot/   Telegram-бот
```

## Запуск сайта локально

```bash
cd web
npm install
npm run dev
```

Открыть: http://localhost:3000

## Деплой сайта на Vercel

При импорте проекта в Vercel укажи:

```text
Root Directory: web
Build Command: npm run build
Output Directory: оставить пустым
Install Command: npm install
```

Оплата, домен и реальные финансовые настройки не подключены.

## Запуск Telegram-бота

```bash
cd bot
npm install
cp .env.example .env
npm start
```

В `.env` нужно заполнить `BOT_TOKEN`.
