"""
Главный файл бота
"""
import asyncio
import logging
import sys
from aiogram import Bot, Dispatcher
from aiogram.enums import ParseMode
from aiogram.client.default import DefaultBotProperties
from bot.config import config
from bot.handlers import setup_routers

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('bot.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)


async def on_startup(bot: Bot) -> None:
    """Действия при запуске бота"""
    bot_info = await bot.get_me()
    logger.info(f"🚀 Бот @{bot_info.username} запущен!")
    
    # Уведомление админу о запуске
    try:
        await bot.send_message(
            chat_id=config.admin_id,
            text="🟢 Бот успешно запущен и готов к работе!"
        )
    except Exception as e:
        logger.warning(f"Не удалось отправить уведомление админу: {e}")


async def on_shutdown(bot: Bot) -> None:
    """Действия при остановке бота"""
    logger.info("🔴 Бот остановлен")
    
    try:
        await bot.send_message(
            chat_id=config.admin_id,
            text="🔴 Бот остановлен"
        )
    except Exception:
        pass


async def main() -> None:
    """Главная функция"""
    
    # Проверка конфигурации
    if not config.bot_token:
        logger.error("❌ BOT_TOKEN не указан в .env файле!")
        return
    
    if not config.admin_id:
        logger.warning("⚠️ ADMIN_ID не указан, уведомления админу отключены")
    
    if not config.webapp_url:
        logger.error("❌ WEBAPP_URL не указан в .env файле!")
        return
    
    # Инициализация бота
    bot = Bot(
        token=config.bot_token,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML)
    )
    
    # Инициализация диспетчера
    dp = Dispatcher()
    
    # Регистрация роутеров
    dp.include_router(setup_routers())
    
    # Регистрация событий
    dp.startup.register(on_startup)
    dp.shutdown.register(on_shutdown)
    
    # Запуск бота
    logger.info("🔄 Запуск бота...")
    
    try:
        await dp.start_polling(
            bot,
            allowed_updates=dp.resolve_used_update_types()
        )
    finally:
        await bot.session.close()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Бот остановлен пользователем")