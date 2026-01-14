// URL вашего Google Apps Script (Русская версия)
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwc1MDttG3H42A08d15TrRTyzAe9M37ZD8snuul9LaJyIEZqed4CfmJ47wpdPFAI3SPNg/exec';

// Функция проверки занятых слотов (API)
async function getBusySlots(date) {
    try {
        console.log(`📡 Запрашиваем слоты на ${date}...`);
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
const isTelegramWebApp = tg && tg.initData && tg.initData.length > 0;

if (tg) {
    tg.ready();
    tg.expand();
    if (tg.themeParams) {
        document.body.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#ffffff');
        document.body.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#000000');
        document.body.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color || '#999999');
        document.body.style.setProperty('--tg-theme-link-color', tg.themeParams.link_color || '#2481cc');
        document.body.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color || '#2481cc');
        document.body.style.setProperty('--tg-theme-secondary-bg-color', tg.themeParams.secondary_bg_color || '#f5f5f5');
    }
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
    selectedTimeSlot: null,
    busySlotsCache: [] // 🔥 Кэш занятых слотов
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
    nameInput: document.getElementById('name'),
    phoneInput: document.getElementById('phone'),
    serviceSelect: document.getElementById('service'),
    dateInput: document.getElementById('date'),
    timeInput: document.getElementById('time'),
    timeSlotsContainer: document.getElementById('timeSlots'),
    serviceInfo: document.getElementById('serviceInfo'),
    servicePrice: document.getElementById('servicePrice'),
    serviceDuration: document.getElementById('serviceDuration'),
    summaryName: document.getElementById('summaryName'),
    summaryPhone: document.getElementById('summaryPhone'),
    summaryService: document.getElementById('summaryService'),
    summaryDateTime: document.getElementById('summaryDateTime')
};

// ===== Utility Functions =====

function formatPhoneNumber(value) {
    const cleaned = value.replace(/\D/g, '');
    let formatted = '';
    if (cleaned.length === 0) return '';
    let digits = cleaned;
    if (cleaned.startsWith('8')) digits = '7' + cleaned.slice(1);
    else if (!cleaned.startsWith('7') && cleaned.length > 0) digits = '7' + cleaned;
    formatted = '+' + digits.slice(0, 1);
    if (digits.length > 1) formatted += ' (' + digits.slice(1, 4);
    if (digits.length > 4) formatted += ') ' + digits.slice(4, 7);
    if (digits.length > 7) formatted += '-' + digits.slice(7, 9);
    if (digits.length > 9) formatted += '-' + digits.slice(9, 11);
    return formatted;
}

function isValidPhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 11;
}

function isValidName(name) {
    return name.trim().length >= 2;
}

function formatDate(dateStr) {
    if (!dateStr) return 'Дата не выбрана';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return 'Неверный формат';
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    if (isNaN(date.getTime())) return 'Неверная дата';
    const weekdays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    return `${weekdays[date.getDay()]}, ${day} ${months[date.getMonth()]} ${year}`;
}

// Вспомогательная функция: добавить минуты к времени "09:00"
function addMinutes(timeStr, minutesToAdd) {
    const [h, m] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m + minutesToAdd);
    const newH = String(date.getHours()).padStart(2, '0');
    const newM = String(date.getMinutes()).padStart(2, '0');
    return `${newH}:${newM}`;
}

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
 * 🔥 ОБНОВЛЕННАЯ ФУНКЦИЯ РЕНДЕРИНГА
 * Проверяет, влезает ли услуга в свободное окно
 */
function renderTimeSlots(busySlotsFromApi = []) {
    // 1. Обновляем кэш
    state.busySlotsCache = busySlotsFromApi;

    const dateValue = elements.dateInput.value;
    if (!dateValue) {
        elements.timeSlotsContainer.innerHTML = '<p style="color: var(--tg-theme-hint-color); text-align: center; grid-column: 1/-1;">Сначала выберите дату</p>';
        return;
    }

    // 2. Получаем длительность услуги
    const selectedOption = elements.serviceSelect.selectedOptions[0];
    let serviceDuration = 60; // По умолчанию 1 час
    if (selectedOption && selectedOption.dataset.duration) {
        serviceDuration = parseInt(selectedOption.dataset.duration);
    }

    const slots = generateTimeSlots();
    const now = new Date();
    const parts = dateValue.split('-');
    const selectedDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    const isToday = selectedDate.getTime() === today.getTime();

    console.log(`📅 Рендер слотов. Длительность: ${serviceDuration}мин. Занято:`, busySlotsFromApi);

    elements.timeSlotsContainer.innerHTML = slots.map(slot => {
        let isDisabled = false;
        let tooltip = "";

        // Проверка 1: Прошло ли время?
        if (isToday) {
            const [h, m] = slot.split(':').map(Number);
            const slotTime = new Date();
            slotTime.setHours(h, m, 0, 0);
            if (slotTime <= now) {
                isDisabled = true;
                tooltip = "Время прошло";
            }
        }

        // Проверка 2: Занят ли сам слот?
        if (!isDisabled && busySlotsFromApi.includes(slot)) {
            isDisabled = true;
            tooltip = "Уже занято";
        }

        // Проверка 3: 🔥 ВЛЕЗЕТ ЛИ УСЛУГА? (Умная проверка)
        if (!isDisabled) {
            const blocksNeeded = Math.ceil(serviceDuration / 30);
            
            // Проверяем текущий блок + будущие
            for (let i = 0; i < blocksNeeded; i++) {
                const timeToCheck = addMinutes(slot, i * 30);
                
                // Если будущий слот занят
                if (busySlotsFromApi.includes(timeToCheck)) {
                    isDisabled = true;
                    tooltip = "Не хватит времени на услугу";
                    break;
                }
                
                // Если выходим за рамки рабочего дня (нет в списке слотов)
                if (i > 0 && !slots.includes(timeToCheck)) {
                    isDisabled = true;
                    tooltip = "Скоро закрытие";
                    break;
                }
            }
        }

        const isSelected = state.selectedTimeSlot === slot;
        let extraClass = "time-slot";
        if (isDisabled) extraClass += " disabled";
        if (isSelected) extraClass += " selected";
        if (tooltip === "Уже занято") extraClass += " booked";

        return `
            <div class="${extraClass}"
                 data-time="${slot}"
                 ${isDisabled ? 'data-disabled="true"' : ''}
                 ${isDisabled ? `title="${tooltip}"` : ''}>
                ${slot}
            </div>
        `;
    }).join('');

    // Обработчики клика
    document.querySelectorAll('.time-slot:not(.disabled)').forEach(slot => {
        slot.addEventListener('click', () => selectTimeSlot(slot));
    });
}

function selectTimeSlot(slotElement) {
    document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
    slotElement.classList.add('selected');
    state.selectedTimeSlot = slotElement.dataset.time;
    elements.timeInput.value = state.selectedTimeSlot;
    if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
    clearError('time');
    updateSummary();
}

// ===== Validation =====

function showError(fieldName, message) {
    const errorElement = document.getElementById(`${fieldName}Error`);
    const inputElement = document.getElementById(fieldName);
    if (errorElement) errorElement.textContent = message;
    if (inputElement) {
        inputElement.classList.add('error');
        inputElement.classList.remove('success');
    }
}

function clearError(fieldName) {
    const errorElement = document.getElementById(`${fieldName}Error`);
    const inputElement = document.getElementById(fieldName);
    if (errorElement) errorElement.textContent = '';
    if (inputElement) inputElement.classList.remove('error');
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
    if (!isValid && tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
    return isValid;
}

// ===== Step Navigation =====

function updateProgress() {
    const progress = (state.currentStep / state.totalSteps) * 100;
    elements.progressFill.style.width = `${progress}%`;
    elements.steps.forEach((step, index) => {
        const stepNum = index + 1;
        step.classList.remove('active', 'completed');
        if (stepNum < state.currentStep) step.classList.add('completed');
        else if (stepNum === state.currentStep) step.classList.add('active');
    });
}

function goToStep(stepNumber) {
    elements.formSteps.forEach(step => step.classList.remove('active'));
    const newStep = document.querySelector(`.form-step[data-step="${stepNumber}"]`);
    if (newStep) newStep.classList.add('active');
    state.currentStep = stepNumber;
    updateProgress();
    updateButtons();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
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
        if (state.currentStep < state.totalSteps) goToStep(state.currentStep + 1);
    }
}

function prevStep() {
    if (state.currentStep > 1) goToStep(state.currentStep - 1);
}

// ===== Form Submission =====

async function submitForm(event) {
    event.preventDefault();
    if (!validateCurrentStep()) return;
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
    console.log('📤 Отправка данных:', formData);
    await new Promise(resolve => setTimeout(resolve, 800));
    try {
        if (tg?.sendData) {
            tg.sendData(JSON.stringify(formData));
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        } else {
            console.log('⚠️ Not running in Telegram WebApp');
            elements.loadingOverlay.classList.remove('active');
            showSuccessMessage(formData);
            return;
        }
    } catch (error) {
        console.error('❌ Ошибка отправки:', error);
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
        elements.loadingOverlay.classList.remove('active');
        if (tg?.showAlert) tg.showAlert('Произошла ошибка при отправке данных');
        else alert('Произошла ошибка при отправке данных');
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

// 🔥 ОБНОВЛЕННЫЙ СЛУШАТЕЛЬ: При смене услуги перерисовываем слоты
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

    // Если дата уже выбрана — пересчитываем слоты с новой длительностью
    if (elements.dateInput.value) {
        renderTimeSlots(state.busySlotsCache);
    }
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

elements.dateInput.addEventListener('change', async (e) => {
    const date = e.target.value;
    console.log('📅 Date changed:', date);
    clearError('date');
    state.selectedTimeSlot = null;
    elements.timeInput.value = '';

    if (date) {
        elements.timeSlotsContainer.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 20px; color: var(--tg-theme-hint-color);">
                ⏳ Проверяем расписание...
            </div>
        `;
        const realBusySlots = await getBusySlots(date);
        renderTimeSlots(realBusySlots);
    } else {
        renderTimeSlots([]);
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
    renderTimeSlots();
    if (!isTelegramWebApp) console.log('⚠️ Running in debug mode');
    console.log('🚀 Booking form initialized');
}

document.addEventListener('DOMContentLoaded', init);
