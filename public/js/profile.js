document.addEventListener("DOMContentLoaded", function () {
    // Проверка авторизации
    fetch("/profile")
        .then(response => {
            console.log("Response status:", response.status, "Response ok:", response.ok);
            if (!response.ok) {
                throw new Error("Не авторизован");
            }
            return response.json();
        })
        .then(user => {
            console.log("Пользователь загружен:", user);

            // Обновляем данные профиля
            document.getElementById("username").textContent = user.username;
            document.getElementById("steam-id").textContent = user.steam_id;
            document.getElementById("balance").textContent = user.balance + " ₽";
            document.getElementById("discount").textContent = user.discount + "%";
            
            // Устанавливаем ID пользователя для переводов
            const userDetailsInfo = document.querySelector('.user-details-info');
            if (userDetailsInfo) {
                userDetailsInfo.dataset.userId = user.id;
            }

            // Проверка наличия элемента аватара
            const avatarElement = document.querySelector(".user-avatar");
            if (!avatarElement) {
                console.error("Элемент .user-avatar не найден на странице!");
                return;
            }

            // Загружаем аватар пользователя (только из кэша)
            loadUserAvatar(user.steam_id, avatarElement);

            // Добавляем проверку роли пользователя для отображения кнопки "Админка"
            const adminButton = document.getElementById("admin-button");
            if (user.role === "admin") {
                adminButton.style.display = "block"; // Показываем кнопку "Админка" для администраторов
                adminButton.addEventListener("click", function () {
                    window.location.href = "/admin_login.html"; // Перенаправление на страницу входа в админку
                });
            } else {
                adminButton.style.display = "none"; // Скрываем кнопку для обычных пользователей
            }

            // Реализуем функциональность для кнопки "Выйти"
            const logoutButton = document.querySelector(".profile-logout-btn");
            logoutButton.addEventListener("click", function () {
                fetch('/logout', { method: 'GET' })
                    .then(response => {
                        if (response.ok) {
                            window.location.href = '/'; // Перенаправление на главную страницу после выхода
                        }
                    })
                    .catch(error => {
                        console.error("Ошибка при выходе:", error);
                    });
            });

            // Если пользователь авторизован, скрываем модальное окно
            const notification = document.getElementById("auth-notification");
            const body = document.querySelector("body");
            notification.classList.remove("show"); // Скрыть модальное окно
            body.classList.remove("blocked"); // Разблокировать страницу

        })
        .catch(error => {
            console.error("Ошибка авторизации:", error.message);
            console.log("Показываем модальное окно для неавторизованного пользователя");

            // Показываем модальное окно, если пользователь не авторизован
            const notification = document.getElementById("auth-notification");
            const body = document.querySelector("body");

            if (notification) {
                notification.classList.add("show"); // Показать модальное окно
                console.log("Модальное окно показано");
            } else {
                console.error("Элемент auth-notification не найден!");
            }
            
            if (body) {
                body.classList.add("blocked"); // Заблокировать страницу
            }
        });
    

    
    // Обработчики для кнопок модального окна авторизации
    const loginBtn = document.getElementById("login-btn");
    const homeBtn = document.getElementById("home-btn");
    
    console.log("Ищем кнопки модального окна:", { loginBtn, homeBtn });
    
    if (loginBtn) {
        loginBtn.addEventListener("click", function () {
            console.log("Кнопка 'Войти' нажата");
            window.location.href = "/auth/steam"; // Перенаправляем на страницу авторизации
        });
        console.log("Обработчик для кнопки 'Войти' добавлен");
    } else {
        console.error("Кнопка 'Войти' не найдена!");
    }
    
    if (homeBtn) {
        homeBtn.addEventListener("click", function () {
            console.log("Кнопка 'На главную' нажата");
            window.location.href = "/"; // Перенаправляем на главную страницу
        });
        console.log("Обработчик для кнопки 'На главную' добавлен");
    } else {
        console.error("Кнопка 'На главную' не найдена!");
    }

    // Обработчики для кнопок меню
    const menuButtons = document.querySelectorAll('.profile-menu-btn');
    const submenuButtons = document.querySelectorAll('.profile-submenu-btn');
    const historyMainBtn = document.querySelector('.history-main-btn');
    const historySubmenu = document.getElementById('history-submenu');
    
    // Обработчик для главной кнопки "История"
    if (historyMainBtn) {
        historyMainBtn.addEventListener('click', function() {
            // Переключаем подменю
            historySubmenu.classList.toggle('show');
            
            // Убираем активный класс со всех кнопок
            menuButtons.forEach(btn => btn.classList.remove('active'));
            submenuButtons.forEach(btn => btn.classList.remove('active'));
            
            // Добавляем активный класс к главной кнопке истории
            this.classList.add('active');
            
            // Загружаем общую историю
            loadSection('history');
        });
    }
    
    // Обработчики для кнопок подменю истории
    submenuButtons.forEach(button => {
        button.addEventListener('click', function() {
            const section = this.getAttribute('data-section');
            loadSection(section);
            
            // Убираем активный класс со всех кнопок
            menuButtons.forEach(btn => btn.classList.remove('active'));
            submenuButtons.forEach(btn => btn.classList.remove('active'));
            
            // Добавляем активный класс к нажатой кнопке подменю
            this.classList.add('active');
            
            // НЕ скрываем подменю - оно остается открытым
        });
    });
    
    // Обработчики для остальных кнопок меню
    menuButtons.forEach(button => {
        if (button !== historyMainBtn) {
            button.addEventListener('click', function() {
                const section = this.getAttribute('data-section');
                loadSection(section);
                
                // Убираем активный класс со всех кнопок
                menuButtons.forEach(btn => btn.classList.remove('active'));
                submenuButtons.forEach(btn => btn.classList.remove('active'));
                
                // Добавляем активный класс к нажатой кнопке
                this.classList.add('active');
                
                // Скрываем подменю истории
                historySubmenu.classList.remove('show');
            });
        }
    });

    function loadSection(section) {
        switch (section) {
            case "history":
                loadOrderHistory();
                return;
            case "history-finance":
                loadFinanceHistory();
                return;
            case "history-purchases":
                loadPurchaseHistory();
                return;
            case "history-activations":
                loadActivationHistory();
                return;
            case "transfers":
                loadFinanceSection();
                return;
            case "promocodes":
                loadPromocodesSection();
                return;
            case "messages":
                loadMessagesSection();
                return;
            case "freeze":
                loadFreezeSection();
                return;
            case "upgrade":
                loadUpgradeSection();
                return;
            default:
                loadDefaultSection();
        }
    }

    function loadDefaultSection() {
        const content = `
            <div class="welcome-section">
                <h2>Добро пожаловать в ваш профиль!</h2>
                <p>Выберите раздел в меню слева для навигации по профилю.</p>
                <div class="quick-stats">
                    <div class="stat-card">
                        <h3>Баланс</h3>
                        <span id="welcome-balance" class="stat-value">0 ₽</span>
                    </div>
                    <div class="stat-card">
                        <h3>Скидка</h3>
                        <span id="welcome-discount" class="stat-value">0%</span>
                    </div>
                </div>
            </div>
        `;
        document.getElementById("dynamic-content").innerHTML = content;
        updateWelcomeStats();
    }

    function updateWelcomeStats() {
        fetch('/profile')
            .then(response => response.json())
            .then(user => {
                const balanceElement = document.getElementById('welcome-balance');
                const discountElement = document.getElementById('welcome-discount');
                if (balanceElement) balanceElement.textContent = user.balance + ' ₽';
                if (discountElement) discountElement.textContent = user.discount + '%';
            })
            .catch(error => {
                console.error('Ошибка при получении статистики:', error);
            });
    }

    // Функции для работы с куками
    function setCookie(name, value, days) {
        const expires = new Date();
        expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000)); // Устанавливаем срок действия
        document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
    }

    function getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    // Универсальная функция загрузки аватара пользователя
    function loadUserAvatar(steamId, avatarElement, checkForUpdates = false) {
        if (!steamId || !avatarElement) {
            console.error("Неверные параметры для загрузки аватара");
            return;
        }

        // Проверяем кэш в cookies
        const avatarCookie = getCookie(`avatar-${steamId}`);
        
        if (avatarCookie && !checkForUpdates) {
            // Если аватарка есть в куках и не нужно проверять обновления, сразу отображаем
            avatarElement.src = avatarCookie;
            console.log("Аватарка загружена из кэша");
        } else {
            // Запрашиваем аватарку с сервера (только при авторизации)
            console.log(`Загружаем аватарку с сервера для Steam ID: ${steamId}${checkForUpdates ? ' (проверка при авторизации)' : ''}`);
            
            fetch(`/steam-avatar/${steamId}`)
                .then(response => response.json())
                .then(data => {
                    if (data.avatarUrl) {
                        // Проверяем, изменилась ли аватарка
                        if (avatarCookie && avatarCookie !== data.avatarUrl) {
                            console.log("Аватарка обновлена! Обновляем кэш");
                        }
                        
                        avatarElement.src = data.avatarUrl;
                        setCookie(`avatar-${steamId}`, data.avatarUrl, 7); // Сохраняем на 7 дней
                        console.log("Аватарка обновлена с сервера");
                    } else {
                        console.warn("Аватар не найден, ставим заглушку");
                        avatarElement.src = "/img/default-avatar.png";
                    }
                })
                .catch(error => {
                    console.error("Ошибка загрузки аватара:", error);
                    avatarElement.src = "/img/default-avatar.png";
                });
        }
    }

    // Новые функции для истории
    function loadPurchaseHistory() {
        document.getElementById("dynamic-content").innerHTML = `
            <h2>История покупок</h2>
            <div class="history-container">
                <div class="history-item">
                    <div class="history-date">2024-01-15 14:30</div>
                    <div class="history-description">Покупка: Хуйня 5.0</div>
                    <div class="history-amount">-20.00 ₽</div>
                </div>
                <div class="history-item">
                    <div class="history-date">2024-01-14 09:15</div>
                    <div class="history-description">Покупка: Хуйня 4.0</div>
                    <div class="history-amount">-10.00 ₽</div>
                </div>
                <div class="history-item">
                    <div class="history-date">2024-01-13 16:45</div>
                    <div class="history-description">Покупка: Хуйня 3.0</div>
                    <div class="history-amount">-1000.00 ₽</div>
                </div>
            </div>
        `;
    }

    function loadActivationHistory() {
        document.getElementById("dynamic-content").innerHTML = `
            <h2>История активаций</h2>
            <div class="history-container">
                <div class="history-item">
                    <div class="history-date">2024-01-15 12:00</div>
                    <div class="history-description">Активация промокода: WELCOME10</div>
                    <div class="history-amount">+10% скидка</div>
                </div>
                <div class="history-item">
                    <div class="history-date">2024-01-14 18:30</div>
                    <div class="history-description">Активация бонуса: Новый игрок</div>
                    <div class="history-amount">+500.00 ₽</div>
                </div>
                <div class="history-item">
                    <div class="history-date">2024-01-13 20:15</div>
                    <div class="history-description">Активация скидки: VIP статус</div>
                    <div class="history-amount">+15% скидка</div>
                </div>
            </div>
        `;
    }

    function loadFinanceHistory() {
        document.getElementById("dynamic-content").innerHTML = `
            <h2>История переводов</h2>
            <div class="history-container">
                <div class="transfer-item sent">
                    <div class="transfer-header">
                        <span class="transfer-type">Отправлен</span>
                        <span class="transfer-date">28 сентября 2025 г. в 16:37</span>
                    </div>
                    <div class="transfer-details">
                        <div class="transfer-user">
                            Получатель: <strong>I Sincerely loving</strong>
                        </div>
                        <div class="transfer-amount sent">
                            -5000 ₽
                            <span class="commission">(комиссия: 250.00 ₽)</span>
                        </div>
                    </div>
                </div>
                <div class="transfer-item received">
                    <div class="transfer-header">
                        <span class="transfer-type">Получен</span>
                        <span class="transfer-date">27 сентября 2025 г. в 14:20</span>
                    </div>
                    <div class="transfer-details">
                        <div class="transfer-user">
                            Отправитель: <strong>TestUser</strong>
                        </div>
                        <div class="transfer-amount received">
                            +1000 ₽
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Функция загрузки общей истории
    function loadOrderHistory() {
        document.getElementById("dynamic-content").innerHTML = `
            <h2>История</h2>
            <div class="history-container">
                <p>Вся история операций (от новых к старым):</p>
                <div class="history-item">
                    <div class="history-date">2024-01-15 14:30</div>
                    <div class="history-description">Покупка: Хуйня 5.0</div>
                    <div class="history-amount negative">-20.00 ₽</div>
                </div>
                <div class="history-item">
                    <div class="history-date">2024-01-15 12:00</div>
                    <div class="history-description">Активация промокода: WELCOME10</div>
                    <div class="history-amount">+10% скидка</div>
                </div>
                <div class="history-item">
                    <div class="history-date">2024-01-14 18:30</div>
                    <div class="history-description">Активация бонуса: Новый игрок</div>
                    <div class="history-amount">+500.00 ₽</div>
                </div>
                <div class="history-item">
                    <div class="history-date">2024-01-14 09:15</div>
                    <div class="history-description">Покупка: Хуйня 4.0</div>
                    <div class="history-amount negative">-10.00 ₽</div>
                </div>
                <div class="history-item">
                    <div class="history-date">2024-01-13 20:15</div>
                    <div class="history-description">Активация скидки: VIP статус</div>
                    <div class="history-amount">+15% скидка</div>
                </div>
                <div class="history-item">
                    <div class="history-date">2024-01-13 16:45</div>
                    <div class="history-description">Покупка: Хуйня 3.0</div>
                    <div class="history-amount negative">-1000.00 ₽</div>
                </div>
                <div class="history-item">
                    <div class="history-date">2024-01-12 10:30</div>
                    <div class="history-description">Пополнение баланса</div>
                    <div class="history-amount">+2000.00 ₽</div>
                </div>
            </div>
        `;
    }

    // Функция загрузки истории заказов (старая версия)
    function loadOrderHistoryOld() {
        fetch('/user-orders')
            .then(response => response.json())
            .then(orders => {
                let content = '<h3>История заказов</h3>';
                
                if (orders.length === 0) {
                    content += '<p style="text-align: center; color: #888; padding: 20px;">У вас пока нет заказов</p>';
                } else {
                    content += '<div class="orders-list">';
                    
                    orders.forEach(order => {
                        const orderDate = new Date(order.created_at).toLocaleDateString('ru-RU', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                        
                        const statusText = order.status === 'completed' ? 'Выполнен' : 
                                         order.status === 'pending' ? 'В обработке' : 'Отменен';
                        
                        const statusClass = order.status === 'completed' ? 'status-completed' : 
                                          order.status === 'pending' ? 'status-pending' : 'status-cancelled';
                        
                        content += `
                            <div class="order-item">
                                <div class="order-header">
                                    <span class="order-id">Заказ #${order.id}</span>
                                    <span class="order-date">${orderDate}</span>
                                    <span class="order-status ${statusClass}">${statusText}</span>
                                </div>
                                <div class="order-items">${order.items}</div>
                                <div class="order-total">Итого: ${order.total_amount} ₽</div>
                            </div>
                        `;
                    });
                    
                    content += '</div>';
                }
                
                document.getElementById("dynamic-content").innerHTML = content;
            })
            .catch(error => {
                console.error('Ошибка при загрузке истории заказов:', error);
                document.getElementById("dynamic-content").innerHTML = 
                    '<h3>История заказов</h3><p style="color: #dc3545;">Ошибка при загрузке истории заказов</p>';
            });
    }

    // Функция загрузки секции финансов
    function loadFinanceSection() {
        const content = `
            <div class="finance-section">
                <h2>Переводы между пользователями</h2>
                
                <div class="transfer-section">
                    <div class="transfer-form-container">
                        <div class="transfer-info">
                            <h4>Информация о переводах</h4>
                            <div class="info-cards">
                                <div class="info-card">
                                    <h5>Комиссия</h5>
                                    <span class="info-value">5%</span>
                                    <p>С каждого перевода взимается комиссия 5%</p>
                                </div>
                                <div class="info-card">
                                    <h5>Минимальная сумма</h5>
                                    <span class="info-value">10 ₽</span>
                                    <p>Минимальная сумма для перевода</p>
                                </div>
                                <div class="info-card">
                                    <h5>Максимальная сумма</h5>
                                    <span class="info-value">50,000 ₽</span>
                                    <p>Максимальная сумма за один перевод</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="transfer-form">
                            <h4>Создать перевод</h4>
                            <form id="transfer-form">
                                <div class="form-group">
                                    <label for="recipient-username">Получатель (имя пользователя):</label>
                                    <input type="text" id="recipient-username" placeholder="Введите имя пользователя" required>
                                    <div id="recipient-info" class="recipient-info" style="display: none;"></div>
                                </div>
                                
                                <div class="form-group">
                                    <label for="transfer-amount">Сумма перевода:</label>
                                    <input type="number" id="transfer-amount" placeholder="Введите сумму" min="10" max="50000" step="0.01" required>
                                    <div class="amount-info">
                                        <span class="commission-info">Комиссия (5%): <span id="commission-amount">0 ₽</span></span>
                                        <span class="total-info">К списанию: <span id="total-amount">0 ₽</span></span>
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <label for="transfer-message">Сообщение (необязательно):</label>
                                    <textarea id="transfer-message" placeholder="Введите сообщение для получателя" maxlength="200"></textarea>
                                </div>
                                
                                <div class="form-actions">
                                    <button type="button" id="check-recipient-btn" class="check-recipient-btn">Проверить получателя</button>
                                    <button type="submit" id="send-transfer-btn" class="send-transfer-btn" disabled>Отправить перевод</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
                
            </div>
        `;
        
        document.getElementById("dynamic-content").innerHTML = content;
        
        // Настраиваем обработчики для переводов
        setupTransferEventListeners();
        loadTransferHistory();
    }

    function setupTransferEventListeners() {
        const recipientInput = document.getElementById('recipient-username');
        const amountInput = document.getElementById('transfer-amount');
        const checkBtn = document.getElementById('check-recipient-btn');
        const transferForm = document.getElementById('transfer-form');
        
        // Проверка получателя при вводе
        let checkTimeout;
        recipientInput.addEventListener('input', function() {
            clearTimeout(checkTimeout);
            checkTimeout = setTimeout(() => {
                if (this.value.length >= 3) {
                    checkRecipient(this.value);
                } else {
                    document.getElementById('recipient-info').style.display = 'none';
                    document.getElementById('send-transfer-btn').disabled = true;
                }
            }, 500);
        });
        
        // Расчет комиссии при изменении суммы
        amountInput.addEventListener('input', calculateTransferAmount);
        
        // Кнопка проверки получателя
        checkBtn.addEventListener('click', function() {
            const username = recipientInput.value.trim();
            if (username) {
                checkRecipient(username);
            }
        });
        
        // Отправка перевода
        transferForm.addEventListener('submit', function(e) {
            e.preventDefault();
            sendTransfer();
        });
    }

    function calculateTransferAmount() {
        const amount = parseFloat(document.getElementById('transfer-amount').value) || 0;
        const commission = amount * 0.05;
        const total = amount + commission;
        
        document.getElementById('commission-amount').textContent = commission.toFixed(2) + ' ₽';
        document.getElementById('total-amount').textContent = total.toFixed(2) + ' ₽';
    }

    function checkRecipient(username) {
        fetch('/check-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username: username })
        })
        .then(response => response.json())
        .then(result => {
            const recipientInfo = document.getElementById('recipient-info');
            const sendBtn = document.getElementById('send-transfer-btn');
            
            if (result.success) {
                recipientInfo.innerHTML = `
                    <div class="recipient-found">
                        <span class="recipient-name">✓ ${result.user.username}</span>
                        <span class="recipient-balance">Баланс: ${result.user.balance} ₽</span>
                    </div>
                `;
                recipientInfo.style.display = 'block';
                sendBtn.disabled = false;
            } else {
                recipientInfo.innerHTML = `
                    <div class="recipient-not-found">
                        <span>✗ Пользователь не найден</span>
                    </div>
                `;
                recipientInfo.style.display = 'block';
                sendBtn.disabled = true;
            }
        })
        .catch(error => {
            console.error('Ошибка при проверке пользователя:', error);
            document.getElementById('recipient-info').innerHTML = `
                <div class="recipient-error">
                    <span>Ошибка при проверке пользователя</span>
                </div>
            `;
            document.getElementById('recipient-info').style.display = 'block';
        });
    }

    function sendTransfer() {
        const recipient = document.getElementById('recipient-username').value.trim();
        const amount = parseFloat(document.getElementById('transfer-amount').value);
        const message = document.getElementById('transfer-message').value.trim();
        
        if (!recipient || !amount || amount < 10 || amount > 50000) {
            alert('Проверьте правильность введенных данных');
            return;
        }
        
        const confirmMessage = `Подтвердите перевод:\n\nПолучатель: ${recipient}\nСумма: ${amount} ₽\nКомиссия: ${(amount * 0.05).toFixed(2)} ₽\nК списанию: ${(amount * 1.05).toFixed(2)} ₽`;
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        fetch('/send-transfer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                recipient_username: recipient,
                amount: amount,
                message: message
            })
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                alert('Перевод успешно отправлен!');
                // Очищаем форму
                document.getElementById('transfer-form').reset();
                document.getElementById('recipient-info').style.display = 'none';
                document.getElementById('send-transfer-btn').disabled = true;
                calculateTransferAmount();
                
                // Обновляем баланс в профиле
                document.getElementById("balance").textContent = result.newBalance + " ₽";
                
                // Обновляем историю переводов
                loadTransferHistory();
            } else {
                alert('Ошибка при отправке перевода: ' + result.error);
            }
        })
        .catch(error => {
            console.error('Ошибка при отправке перевода:', error);
            alert('Ошибка при отправке перевода');
        });
    }

    function loadTransferHistory() {
        fetch('/transfer-history')
            .then(response => response.json())
            .then(transfers => {
                const transfersList = document.getElementById('transfers-list');
                
                if (transfers.length === 0) {
                    transfersList.innerHTML = '<p class="no-transfers">У вас пока нет переводов</p>';
                    return;
                }
                
                let html = '';
                transfers.forEach(transfer => {
                    const date = new Date(transfer.created_at).toLocaleDateString('ru-RU', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    
                    const type = transfer.sender_id === parseInt(document.querySelector('[data-user-id]')?.dataset.userId) ? 'sent' : 'received';
                    const otherUser = type === 'sent' ? transfer.recipient_username : transfer.sender_username;
                    const amount = type === 'sent' ? -transfer.amount : transfer.amount;
                    const commission = type === 'sent' ? transfer.commission : 0;
                    
                    html += `
                        <div class="transfer-item ${type}">
                            <div class="transfer-header">
                                <span class="transfer-type">${type === 'sent' ? 'Отправлен' : 'Получен'}</span>
                                <span class="transfer-date">${date}</span>
                            </div>
                            <div class="transfer-details">
                                <div class="transfer-user">
                                    ${type === 'sent' ? 'Получатель' : 'Отправитель'}: <strong>${otherUser}</strong>
                                </div>
                                <div class="transfer-amount ${type}">
                                    ${type === 'sent' ? '-' : '+'}${Math.abs(amount)} ₽
                                    ${commission > 0 ? `<span class="commission">(комиссия: ${commission} ₽)</span>` : ''}
                                </div>
                                ${transfer.message ? `<div class="transfer-message">"${transfer.message}"</div>` : ''}
                            </div>
                        </div>
                    `;
                });
                
                transfersList.innerHTML = html;
            })
            .catch(error => {
                console.error('Ошибка при загрузке истории переводов:', error);
                document.getElementById('transfers-list').innerHTML = 
                    '<p class="error">Ошибка при загрузке истории переводов</p>';
            });
    }

    // Заглушки для других секций
    function loadPromocodesSection() {
        const content = `
            <div class="section-placeholder">
                <h2>Промокоды</h2>
                <p>Раздел промокодов находится в разработке.</p>
            </div>
        `;
        document.getElementById("dynamic-content").innerHTML = content;
    }

    function loadMessagesSection() {
        const content = `
            <div class="section-placeholder">
                <h2>Сообщения</h2>
                <p>Раздел сообщений находится в разработке.</p>
            </div>
        `;
        document.getElementById("dynamic-content").innerHTML = content;
    }

    function loadFreezeSection() {
        const content = `
            <div class="section-placeholder">
                <h2>Заморозка</h2>
                <p>Раздел заморозки находится в разработке.</p>
            </div>
        `;
        document.getElementById("dynamic-content").innerHTML = content;
    }

    function loadUpgradeSection() {
        const content = `
            <div class="section-placeholder">
                <h2>Улучшение</h2>
                <p>Раздел улучшений находится в разработке.</p>
            </div>
        `;
        document.getElementById("dynamic-content").innerHTML = content;
    }
});
