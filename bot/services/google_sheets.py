"""
Сервис для работы с Google Sheets
"""
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from datetime import datetime
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class GoogleSheetsService:
    """Сервис для работы с Google Таблицами"""
    
    SCOPES = [
        'https://spreadsheets.google.com/feeds',
        'https://www.googleapis.com/auth/drive'
    ]
    
    def __init__(self, credentials_file: str, sheet_name: str):
        self.credentials_file = credentials_file
        self.sheet_name = sheet_name
        self._client: Optional[gspread.Client] = None
        self._sheet: Optional[gspread.Spreadsheet] = None
        self._worksheet: Optional[gspread.Worksheet] = None
    
    def _connect(self) -> None:
        """Подключение к Google Sheets"""
        try:
            credentials = ServiceAccountCredentials.from_json_keyfile_name(
                self.credentials_file, 
                self.SCOPES
            )
            self._client = gspread.authorize(credentials)
            self._sheet = self._client.open(self.sheet_name)
            self._worksheet = self._sheet.sheet1
            logger.info("✅ Успешное подключение к Google Sheets")
        except Exception as e:
            logger.error(f"❌ Ошибка подключения к Google Sheets: {e}")
            raise
    
    def _ensure_connection(self) -> None:
        """Проверка и восстановление соединения"""
        if self._worksheet is None:
            self._connect()
    
    def _ensure_headers(self) -> None:
        """Проверка и создание заголовков"""
        self._ensure_connection()
        
        headers = ["ID", "Дата записи", "Имя", "Телефон", "Услуга", "Дата/Время визита", "User ID", "Username"]
        
        try:
            first_row = self._worksheet.row_values(1)
            if not first_row:
                self._worksheet.append_row(headers)
                # Форматирование заголовков
                self._worksheet.format('A1:H1', {
                    "backgroundColor": {"red": 0.2, "green": 0.5, "blue": 0.9},
                    "textFormat": {"bold": True, "foregroundColor": {"red": 1, "green": 1, "blue": 1}},
                    "horizontalAlignment": "CENTER"
                })
                logger.info("✅ Заголовки созданы")
        except Exception as e:
            logger.error(f"❌ Ошибка при создании заголовков: {e}")
    
    async def add_booking(
        self, 
        name: str, 
        phone: str, 
        service: str, 
        date_time: str,
        user_id: int,
        username: str = ""
    ) -> dict:
        """
        Добавление записи в таблицу
        
        Returns:
            dict: Информация о записи с ID
        """
        self._ensure_headers()
        
        try:
            # Генерация ID записи
            all_records = self._worksheet.get_all_values()
            booking_id = len(all_records)  # Номер записи
            
            # Текущая дата и время
            created_at = datetime.now().strftime("%d.%m.%Y %H:%M")
            
            # Данные для записи
            row_data = [
                booking_id,
                created_at,
                name,
                phone,
                service,
                date_time,
                user_id,
                username
            ]
            
            # Добавление строки
            self._worksheet.append_row(row_data)
            
            logger.info(f"✅ Запись #{booking_id} добавлена: {name} - {service}")
            
            return {
                "id": booking_id,
                "created_at": created_at,
                "name": name,
                "phone": phone,
                "service": service,
                "date_time": date_time
            }
            
        except Exception as e:
            logger.error(f"❌ Ошибка при добавлении записи: {e}")
            raise
    
    def get_all_bookings(self) -> list:
        """Получение всех записей"""
        self._ensure_connection()
        return self._worksheet.get_all_records()
    
    def get_bookings_count(self) -> int:
        """Получение количества записей"""
        self._ensure_connection()
        return len(self._worksheet.get_all_values()) - 1  # Минус заголовок