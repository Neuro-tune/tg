@echo off
chcp 65001 > nul
title Установка Бота (Первый запуск)
color 0A

echo ==========================================
echo    НАСТРОЙКА БОТА ДЛЯ ЗАПИСИ КЛИЕНТОВ
echo ==========================================
echo.
echo 1. Создаем виртуальное окружение...
python -m venv venv

echo.
echo 2. Активируем окружение...
call venv\Scripts\activate

echo.
echo 3. Обновляем pip...
python -m pip install --upgrade pip

echo.
echo 4. Устанавливаем библиотеки (это может занять время)...
pip install -r requirements.txt

echo.
echo ==========================================
echo    УСТАНОВКА УСПЕШНО ЗАВЕРШЕНА!
echo ==========================================
echo.
echo Теперь вы можете запускать бота через файл start.bat
echo.
pause