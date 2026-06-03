# RSService26 v1

Первая рабочая версия: Next.js сайт + магазин запчастей + корзина + заказы + запись + Telegram-бот.

## Web
```bash
cd web
npm install
npx prisma db push
npm run db:seed
npm run dev
```
Открыть: http://localhost:3000

## Bot
```bash
cd bot
npm install
cp .env.example .env
# заполнить BOT_TOKEN, MANAGER_CHAT_ID, WEBHOOK_URL
npm start
```

## Что работает
- Каталог запчастей из БД/JSON
- Корзина в localStorage
- Оформление заказа в SQLite через Prisma
- Списание остатков
- Уведомления в Telegram и email при наличии env
- Запись на сервис
- Telegram-бот: запись, поиск запчастей, FAQ, связь с менеджером

## Следующий шаг
Подключить продакшен-БД, оплату ЮKassa/СБП, личный кабинет и админку заказов.
