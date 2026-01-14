"""
Обработчик данных из Web App
"""
import json
import logging
from aiogram import Router, F, Bot
from aiogram.types import Message
from bot.config import config
from bot.services.google_sheets import GoogleSheetsService

router = Router(name="webapp")
logger = logging.getLogger(__name__)

# Инициализация сервиса Google Sheets
sheets_service = GoogleSheetsService(
    credentials_file=config.credentials_file,
    sheet_name=config.google_sheet_name
)


def format_booking_message(booking: dict, user_info: str = "") -> str:
    """Форматирование сообщения о записи"""
    return f"""
🎉 <b>Новая запись #{booking['id']}</b>

👤 <b>Клиент:</b> {booking['name']}
📱 <b>Телефон:</b> {booking['phone']}
💼 <b>Услуга:</b> {booking['service']}
📅 <b>Дата/Время:</b> {booking['date_time']}
🕐 <b>Создано:</b> {booking['created_at']}
{user_info}
"""


@router.message(F.web_app_data)
async def handle_webapp_data(message: Message, bot: Bot) -> None:
    """Обработка данных из Web App"""
    
    try:
        # Парсинг данных из Web App
        data = json.loads(message.web_app_data.data)
        
        logger.info(f"📥 Получены данные из Web App: {data}")
        
        # Валидация данных
        required_fields = ['name', 'phone', 'service', 'datetime']
        for field in required_fields:
            if field not in data or not data[field]:
                await message.answer(
                    f"❌ Ошибка: поле '{field}' обязательно для заполнения"
                )
                return
        
        # Сохранение в Google Sheets
        booking = await sheets_service.add_booking(
            name=data['name'],
            phone=data['phone'],
            service=data['service'],
            date_time=data['datetime'],
            user_id=message.from_user.id,
            username=message.from_user.username or ""
        )
        
        # Подтверждение пользователю
        user_message = f"""
✅ <b>Запись успешно создана!</b>

📋 <b>Детали записи:</b>
├ 🆔 Номер: #{booking['id']}
├ 👤 Имя: {booking['name']}
├ 📱 Телефон: {booking['phone']}
├ 💼 Услуга: {booking['service']}
└ 📅 Дата/Время: {booking['date_time']}

⏰ Мы напомним вам о визите!
📞 Если нужно отменить или перенести запись, свяжитесь с нами.

Спасибо, что выбрали нас! 💙
"""
        
        await message.answer(user_message, parse_mode="HTML")
        
        # Уведомление админу
        user_info = f"👤 <b>Telegram:</b> @{message.from_user.username}" if message.from_user.username else f"👤 <b>User ID:</b> {message.from_user.id}"
        
        admin_message = format_booking_message(booking, user_info)
        admin_message += "\n━━━━━━━━━━━━━━━━━━━━━━"
        
        try:
            await bot.send_message(
                chat_id=config.admin_id,
                text=admin_message,
                parse_mode="HTML"
            )
            logger.info(f"✅ Уведомление отправлено админу (ID: {config.admin_id})")
        except Exception as e:
            logger.error(f"❌ Ошибка отправки уведомления админу: {e}")
        
    except json.JSONDecodeError as e:
        logger.error(f"❌ Ошибка парсинга JSON: {e}")
        await message.answer("❌ Ошибка обработки данных. Попробуйте ещё раз.")
        
    except Exception as e:
        logger.error(f"❌ Ошибка обработки данных Web App: {e}")
        await message.answer(
            "❌ Произошла ошибка при создании записи.\n"
            "Пожалуйста, попробуйте позже или свяжитесь с нами."
        )