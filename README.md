### Получение токена Telegram бота

## Шаг 1: Создание бота через @BotFather

1. Откройте Telegram и найдите бота @BotFather
2. Отправьте команду /newbot
3. Введите имя бота (например: "Салон красоты")
4. Введите username бота (например: beauty_salon_bot)
5. Скопируйте токен (формат: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz)

## Шаг 2: Настройка Web App

1. Отправьте @BotFather команду /mybots
2. Выберите вашего бота
3. Нажмите "Bot Settings" → "Menu Button" → "Configure menu button"
4. Отправьте URL вашего Web App (https://yourdomain.com/webapp/)

## Шаг 3: Получение вашего Telegram ID

1. Найдите бота @userinfobot
2. Отправьте /start
3. Скопируйте ваш ID (число)

### Настройка Google Sheets API

## Шаг 1: Создание проекта в Google Cloud Console

1. Перейдите на https://console.cloud.google.com/
2. Создайте новый проект (например: "Telegram Booking Bot")
3. Выберите созданный проект

## Шаг 2: Включение API

1. В боковом меню выберите "APIs & Services" → "Enable APIs and Services"
2. Найдите и включите:
   - Google Sheets API
   - Google Drive API

## Шаг 3: Создание сервисного аккаунта

1. Перейдите в "APIs & Services" → "Credentials"
2. Нажмите "Create Credentials" → "Service Account"
3. Введите имя (например: "booking-bot")
4. Нажмите "Create and Continue"
5. Выберите роль "Editor"
6. Нажмите "Done"

## Шаг 4: Создание ключа JSON

1. Нажмите на созданный сервисный аккаунт
2. Перейдите на вкладку "Keys"
3. Нажмите "Add Key" → "Create new key"
4. Выберите формат JSON
5. Скачайте файл и переименуйте в credentials.json

## Шаг 5: Настройка Google Таблицы

1. Создайте новую Google Таблицу
2. Назовите её "Записи клиентов"
3. Откройте файл credentials.json
4. Найдите поле "client_email" (формат: xxx@xxx.iam.gserviceaccount.com)
5. В Google Таблице нажмите "Поделиться"
6. Добавьте email сервисного аккаунта с правами "Редактор"