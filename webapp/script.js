const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwc1MDttG3H42A08d15TrRTyzAe9M37ZD8snuul9LaJyIEZqed4CfmJ47wpdPFAI3SPNg/exec';

// Функция проверки занятых слотов (API)
async function getBusySlots(date) {
    try {
        console.log(`📡 Запрашиваем слоты на ${date}...`);
        // Google Script требует no-cors или простого GET
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?date=${date}`);
        const data = await response.json();

        if (data.success) {
            console.log('🔒 Занятые слоты из таблицы:', data.busy_slots);
            // Возвращаем массив времени, например ['14:00', '15:00']
            return data.busy_slots.map(slot => slot.time);
        }
        return [];
    } catch (e) {
        console.error('❌ Ошибка получения слотов:', e);
        return [];
    }
}

const tg = window.Telegram?.WebApp;

// Проверка, запущено ли из Telegram
const isTelegramWebApp = tg && tg.initData && tg.initData.length > 0;

// Инициализация Web App
if (tg) {
    tg.ready();
    tg.expand();

    // Применение темы Telegram
    if (tg.themeParams) {
        document.body.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#ffffff');
        document.body.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#000000');
        document.body.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color || '#999999');
        document.body.style.setProperty('--tg-theme-link-color', tg.themeParams.link_color || '#2481cc');
        document.body.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color || '#2481cc');
        document.body.style.setProperty('--tg-theme-secondary-bg-color', tg.themeParams.secondary_bg_color || '#f5f5f5');
    }

    // Добавление класса темной темы
    if (tg.colorScheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
}

console.log('🔍 Telegram WebApp detected:', isTelegramWebApp);

// ===== State Management =====
const state = {
    currentStep: 1,
    totalSteps: 3,
    formData: {
        name: '',
        phone: '',
        service: '',
        date: '',
        time: ''
    },
    selectedTimeSlot: null
};

// ===== DOM Elements =====
const elements = {
    form: document.getElementById('bookingForm'),
    progressFill: document.getElementById('progressFill'),
    steps: document.querySelectorAll('.step'),
    formSteps: document.querySelectorAll('.form-step'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    submitBtn: document.getElementById('submitBtn'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    summary: document.getElementById('summary'),

    // Inputs
    nameInput: document.getElementById('name'),
    phoneInput: document.getElementById('phone'),
    serviceSelect: document.getElementById('service'),
    dateInput: document.getElementById('date'),
    timeInput: document.getElementById('time'),
    timeSlotsContainer: document.getElementById('timeSlots'),

    // Service Info
    serviceInfo: document.getElementById('serviceInfo'),
    servicePrice: document.getElementById('servicePrice'),
    serviceDuration: document.getElementById('serviceDuration'),

    // Summary
    summaryName: document.getElementById('summaryName'),
    summaryPhone: document.getElementById('summaryPhone'),
    summaryService: document.getElementById('summaryService'),
    summaryDateTime: document.getElementById('summaryDateTime')
};

// ===== Utility Functions =====

/**
 * Форматирование телефона
 */
function formatPhoneNumber(value) {
    const cleaned = value.replace(/\D/g, '');
    let formatted = '';

    if (cleaned.length === 0) return '';

    let digits = cleaned;
    if (cleaned.startsWith('8')) {
        digits = '7' + cleaned.slice(1);
    } else if (!cleaned.startsWith('7') && cleaned.length > 0) {
        digits = '7' + cleaned;
    }

    formatted = '+' + digits.slice(0, 1);

    if (digits.length > 1) {
        formatted += ' (' + digits.slice(1, 4);
    }
    if (digits.length > 4) {
        formatted += ') ' + digits.slice(4, 7);
    }
    if (digits.length > 7) {
        formatted += '-' + digits.slice(7, 9);
    }
    if (digits.length > 9) {
        formatted += '-' + digits.slice(9, 11);
    }

    return formatted;
}

/**
 * Валидация телефона
 */
function isValidPhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 11;
}

/**
 * Валидация имени
 */
function isValidName(name) {
    return name.trim().length >= 2;
}

/**
 * 🔧 Функция форматирования даты
 */
function formatDate(dateStr) {
    if (!dateStr) {
        return 'Дата не выбрана';
    }

    // Парсим дату вручную из формата YYYY-MM-DD
    const parts = dateStr.split('-');

    if (parts.length !== 3) {
        return 'Неверный формат';
    }

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    const date = new Date(year, month, day);

    if (isNaN(date.getTime())) {
        return 'Неверная дата';
    }

    const weekdays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const months = [
        'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];

    const weekday = weekdays[date.getDay()];
    const dayNum = date.getDate();
    const monthName = months[date.getMonth()];
    const yearNum = date.getFullYear();

    return `${weekday}, ${dayNum} ${monthName} ${yearNum}`;
}

/**
 * Генерация временных слотов
 */
function generateTimeSlots() {
    const slots = [];
    const startHour = 9;
    const endHour = 20;

    for (let hour = startHour; hour < endHour; hour++) {
        slots.push(`${hour.toString().padStart(2, '0')}:00`);
        slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }

    return slots;
}

/**
 * 🔧 ОБНОВЛЕННАЯ функция рендеринга слотов (принимает данные из API)
 */
function renderTimeSlots(busySlotsFromApi = []) {
    const dateValue = elements.dateInput.value;

    if (!dateValue) {
        elements.timeSlotsContainer.innerHTML = '<p style="color: var(--tg-theme-hint-color); text-align: center; grid-column: 1/-1;">Сначала выберите дату</p>';
        return;
    }

    const slots = generateTimeSlots();
    const now = new Date();

    // Парсим выбранную дату
    const parts = dateValue.split('-');
    const selectedDate = new Date(
        parseInt(parts[0], 10),
        parseInt(parts[1], 10) - 1,
        parseInt(parts[2], 10)
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);

    const isToday = selectedDate.getTime() === today.getTime();

    console.log('📅 Rendering slots. Busy:', busySlotsFromApi);

    // Используем реальные занятые слоты из API
    const busySlots = busySlotsFromApi;

    elements.timeSlotsContainer.innerHTML = slots.map(slot => {
        const [hours, minutes] = slot.split(':').map(Number);

        let isPast = false;
        if (isToday) {
            const slotTime = new Date();
            slotTime.setHours(hours, minutes, 0, 0);
            isPast = slotTime <= now;
        }

        const isBusy = busySlots.includes(slot);
        const isDisabled = isPast || isBusy;
        const isSelected = state.selectedTimeSlot === slot;

        // Добавляем разные классы для прошедших и занятых слотов
        let extraClass = '';
        if (isPast) extraClass = 'disabled';
        if (isBusy) extraClass = 'disabled booked';

        return `
            <div class="time-slot ${isDisabled ? 'disabled' : ''} ${isSelected ? 'selected' : ''}"
                 data-time="${slot}"
                 ${isDisabled ? 'data-disabled="true"' : ''}
                 ${isBusy ? 'title="Это время уже занято"' : ''}>
                ${slot}
            </div>
        `;
    }).join('');

    // Добавляем обработчики
    document.querySelectorAll('.time-slot:not(.disabled)').forEach(slot => {
        slot.addEventListener('click', () => selectTimeSlot(slot));
    });
}

/**
 * Выбор временного слота
 */
function selectTimeSlot(slotElement) {
    document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));

    slotElement.classList.add('selected');
    state.selectedTimeSlot = slotElement.dataset.time;
    elements.timeInput.value = state.selectedTimeSlot;

    console.log('⏰ Selected time:', state.selectedTimeSlot);

    if (tg?.HapticFeedback) {
        tg.HapticFeedback.selectionChanged();
    }

    clearError('time');
    updateSummary();
}

// ===== Validation =====

function showError(fieldName, message) {
    const errorElement = document.getElementById(`${fieldName}Error`);
    const inputElement = document.getElementById(fieldName);

    if (errorElement) {
        errorElement.textContent = message;
    }

    if (inputElement) {
        inputElement.classList.add('error');
        inputElement.classList.remove('success');
    }
}

function clearError(fieldName) {
    const errorElement = document.getElementById(`${fieldName}Error`);
    const inputElement = document.getElementById(fieldName);

    if (errorElement) {
        errorElement.textContent = '';
    }

    if (inputElement) {
        inputElement.classList.remove('error');
    }
}

function showSuccess(fieldName) {
    const inputElement = document.getElementById(fieldName);
    if (inputElement) {
        inputElement.classList.remove('error');
        inputElement.classList.add('success');
    }
}

function validateCurrentStep() {
    let isValid = true;

    switch (state.currentStep) {
        case 1:
            if (!isValidName(elements.nameInput.value)) {
                showError('name', 'Введите корректное имя (минимум 2 символа)');
                isValid = false;
            } else {
                clearError('name');
                showSuccess('name');
            }

            if (!isValidPhone(elements.phoneInput.value)) {
                showError('phone', 'Введите корректный номер телефона');
                isValid = false;
            } else {
                clearError('phone');
                showSuccess('phone');
            }
            break;

        case 2:
            if (!elements.serviceSelect.value) {
                showError('service', 'Выберите услугу');
                isValid = false;
            } else {
                clearError('service');
            }
            break;

        case 3:
            if (!elements.dateInput.value) {
                showError('date', 'Выберите дату');
                isValid = false;
            } else {
                clearError('date');
            }

            if (!elements.timeInput.value) {
                showError('time', 'Выберите время');
                isValid = false;
            } else {
                clearError('time');
            }
            break;
    }

    if (!isValid && tg?.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('error');
    }

    return isValid;
}

// ===== Step Navigation =====

function updateProgress() {
    const progress = (state.currentStep / state.totalSteps) * 100;
    elements.progressFill.style.width = `${progress}%`;

    elements.steps.forEach((step, index) => {
        const stepNum = index + 1;
        step.classList.remove('active', 'completed');

        if (stepNum < state.currentStep) {
            step.classList.add('completed');
        } else if (stepNum === state.currentStep) {
            step.classList.add('active');
        }
    });
}

function goToStep(stepNumber) {
    elements.formSteps.forEach(step => step.classList.remove('active'));

    const newStep = document.querySelector(`.form-step[data-step="${stepNumber}"]`);
    if (newStep) {
        newStep.classList.add('active');
    }

    state.currentStep = stepNumber;
    updateProgress();
    updateButtons();

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (tg?.HapticFeedback) {
        tg.HapticFeedback.selectionChanged();
    }
}

function updateButtons() {
    elements.prevBtn.style.display = state.currentStep > 1 ? 'flex' : 'none';

    if (state.currentStep === state.totalSteps) {
        elements.nextBtn.style.display = 'none';
        elements.submitBtn.style.display = 'flex';
        elements.summary.style.display = 'block';
        updateSummary();
    } else {
        elements.nextBtn.style.display = 'flex';
        elements.submitBtn.style.display = 'none';
        elements.summary.style.display = 'none';
    }
}

function updateSummary() {
    const dateValue = elements.dateInput.value;
    const timeValue = elements.timeInput.value;

    elements.summaryName.textContent = elements.nameInput.value;
    elements.summaryPhone.textContent = elements.phoneInput.value;
    elements.summaryService.textContent = elements.serviceSelect.value;

    const formattedDate = formatDate(dateValue);
    const dateTimeString = timeValue ? `${formattedDate}, ${timeValue}` : formattedDate;

    elements.summaryDateTime.textContent = dateTimeString;
}

function nextStep() {
    if (validateCurrentStep()) {
        if (state.currentStep < state.totalSteps) {
            goToStep(state.currentStep + 1);
        }
    }
}

function prevStep() {
    if (state.currentStep > 1) {
        goToStep(state.currentStep - 1);
    }
}

// ===== Form Submission =====

async function submitForm(event) {
    event.preventDefault();

    if (!validateCurrentStep()) {
        return;
    }

    // Показываем лоадер
    elements.loadingOverlay.classList.add('active');

    const dateValue = elements.dateInput.value;
    const timeValue = elements.timeInput.value;
    const formattedDateTime = `${formatDate(dateValue)}, ${timeValue}`;

    const formData = {
        name: elements.nameInput.value.trim(),
        phone: elements.phoneInput.value,
        service: elements.serviceSelect.value,
        datetime: formattedDateTime
    };

    console.log('📤 Submitting form data:', formData);

    await new Promise(resolve => setTimeout(resolve, 800));

    try {
        if (tg?.sendData) {
            tg.sendData(JSON.stringify(formData));

            if (tg.HapticFeedback) {
                tg.HapticFeedback.notificationOccurred('success');
            }
        } else {
            console.log('⚠️ Not running in Telegram WebApp');
            elements.loadingOverlay.classList.remove('active');
            showSuccessMessage(formData);
            return;
        }

    } catch (error) {
        console.error('❌ Error sending data:', error);

        if (tg?.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('error');
        }

        elements.loadingOverlay.classList.remove('active');

        if (tg?.showAlert) {
            tg.showAlert('Произошла ошибка при отправке данных');
        } else {
            alert('Произошла ошибка при отправке данных');
        }
    }
}

function showSuccessMessage(formData) {
    const modal = document.createElement('div');
    modal.className = 'success-modal';
    modal.innerHTML = `
        <div class="success-modal-content">
            <div class="success-icon">
                <span class="material-icons-round">check_circle</span>
            </div>
            <h2>Запись создана!</h2>
            <div class="success-details">
                <p><strong>Имя:</strong> ${formData.name}</p>
                <p><strong>Телефон:</strong> ${formData.phone}</p>
                <p><strong>Услуга:</strong> ${formData.service}</p>
                <p><strong>Дата/Время:</strong> ${formData.datetime}</p>
            </div>
            <p class="debug-note">⚠️ Режим отладки: откройте в Telegram для реальной отправки</p>
            <button class="btn btn-primary" onclick="this.closest('.success-modal').remove(); location.reload();">
                Закрыть
            </button>
        </div>
    `;

    document.body.appendChild(modal);
}

// ===== Event Listeners =====

elements.phoneInput.addEventListener('input', (e) => {
    e.target.value = formatPhoneNumber(e.target.value);
});

elements.serviceSelect.addEventListener('change', (e) => {
    const selectedOption = e.target.selectedOptions[0];
    const price = selectedOption.dataset.price;
    const duration = selectedOption.dataset.duration;

    if (price && duration) {
        elements.servicePrice.textContent = `${parseInt(price).toLocaleString('ru-RU')} ₽`;
        elements.serviceDuration.textContent = `${duration} мин`;
        elements.serviceInfo.style.display = 'block';
    } else {
        elements.serviceInfo.style.display = 'none';
    }

    clearError('service');
});

function setupDateInput() {
    const today = new Date();
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 2);

    const formatForInput = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    elements.dateInput.min = formatForInput(today);
    elements.dateInput.max = formatForInput(maxDate);
}

// 🔥 ИСПРАВЛЕННЫЙ обработчик изменения даты
// Теперь он делает запрос к Google Script перед тем как показать время
elements.dateInput.addEventListener('change', async (e) => {
    const date = e.target.value;
    console.log('📅 Date changed:', date);
    clearError('date');

    // Сброс выбранного времени
    state.selectedTimeSlot = null;
    elements.timeInput.value = '';

    if (date) {
        // Показываем лоадер вместо кнопок времени
        elements.timeSlotsContainer.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 20px; color: var(--tg-theme-hint-color);">
                ⏳ Проверяем расписание...
            </div>
        `;

        // 1. Получаем занятые слоты из Гугла
        const realBusySlots = await getBusySlots(date);

        // 2. Рисуем слоты с учетом занятых
        renderTimeSlots(realBusySlots);
    } else {
        renderTimeSlots([]); // Если дата не выбрана, покажет заглушку
    }

    updateSummary();
});

elements.nameInput.addEventListener('input', () => clearError('name'));
elements.phoneInput.addEventListener('input', () => clearError('phone'));
elements.nextBtn.addEventListener('click', nextStep);
elements.prevBtn.addEventListener('click', prevStep);
elements.form.addEventListener('submit', submitForm);

// ===== Initialization =====

function init() {
    setupDateInput();
    updateProgress();
    updateButtons();

    // Запускаем рендеринг сразу (покажет "Выберите дату")
    renderTimeSlots();

    if (!isTelegramWebApp) {
        console.log('⚠️ Running in debug mode');
    }

    console.log('🚀 Booking form initialized');
}

document.addEventListener('DOMContentLoaded', init);