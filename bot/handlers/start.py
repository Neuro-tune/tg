"""
Обработчик команды /start с Reply Keyboard
"""
from aiogram import Router, F
from aiogram.filters import CommandStart, Command
from aiogram.types import (
    Message, 
    ReplyKeyboardMarkup, 
    KeyboardButton, 
    WebAppInfo,
    InlineKeyboardMarkup,
    InlineKeyboardButton
)
from bot.config import config

router = Router(name="start")


def get_webapp_keyboard() -> ReplyKeyboardMarkup:
    """
    Reply Keyboard с Web App кнопкой
    ЭТО ЕДИНСТВЕННЫЙ СПОСОБ, при котором работает sendData()!
    """
    keyboard = ReplyKeyboardMarkup(
        keyboard=[
            [
                KeyboardButton(
                    text="📝 Записаться на приём",
                    web_app=WebAppInfo(url=config.webapp_url)
                )
            ],
            [
                KeyboardButton(text="📞 Связаться с нами"),
                KeyboardButton(text="ℹ️ О нас")
            ],
            [
                KeyboardButton(text="📋 Мои записи")
            ]
        ],
        resize_keyboard=True,  # Уменьшить размер кнопок
        is_persistent=True     # Клавиатура всегда видна
    )
    return keyboard


def get_inline_keyboard() -> InlineKeyboardMarkup:
    """Дополнительные Inline кнопки (без Web App)"""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🌐 Наш сайт",
                    url="https://example.com"
                ),
                InlineKeyboardButton(
                    text="📱 Instagram",
                    url="https://instagram.com/example"
                )
            ]
        ]
    )


@router.message(CommandStart())
async def cmd_start(message: Message) -> None:
    """Обработчик команды /start"""
    
    welcome_text = f"""
👋 <b>Добро пожаловать, {message.from_user.first_name}!</b>

🏥 Мы рады приветствовать вас в нашем сервисе онлайн-записи.

✨ <b>Что мы предлагаем:</b>
• Удобная запись в пару кликов
• Выбор удобного времени
• Напоминания о визите
• История ваших записей

👇 <b>Нажмите кнопку ниже, чтобы записаться:</b>
"""
    
    await message.answer(
        welcome_text,
        reply_markup=get_webapp_keyboard(),
        parse_mode="HTML"
    )


# Обработчики текстовых кнопок Reply Keyboard
@router.message(F.text == "📞 Связаться с нами")
async def handle_contact(message: Message) -> None:
    """Обработчик кнопки 'Связаться с нами'"""
    contact_text = """
📞 <b>Наши контакты:</b>

📱 Телефон: +7 (999) 123-45-67
📧 Email: info@example.com
🕐 Время работы: Пн-Пт 9:00 - 20:00

📍 Адрес: г. Москва, ул. Примерная, д. 1
"""
    await message.answer(contact_text, parse_mode="HTML")


@router.message(F.text == "ℹ️ О нас")
async def handle_about(message: Message) -> None:
    """Обработчик кнопки 'О нас'"""
    about_text = """
ℹ️ <b>О нашей компании</b>

Мы работаем с 2020 года и предоставляем 
качественные услуги нашим клиентам.

🏆 Более 1000 довольных клиентов
⭐ Рейтинг 4.9 на Яндекс.Картах
👨‍⚕️ Опытные специалисты
"""
    await message.answer(about_text, parse_mode="HTML")


@router.message(F.text == "📋 Мои записи")
async def handle_my_bookings(message: Message) -> None:
    """Обработчик кнопки 'Мои записи'"""
    # Здесь можно добавить логику получения записей пользователя
    await message.answer(
        "📋 <b>Ваши записи:</b>\n\nУ вас пока нет активных записей.",
        parse_mode="HTML"
    )


@router.message(Command("menu"))
async def cmd_menu(message: Message) -> None:
    """Показать главное меню"""
    await message.answer(
        "📱 <b>Главное меню</b>\n\nВыберите действие:",
        reply_markup=get_webapp_keyboard(),
        parse_mode="HTML"
    )