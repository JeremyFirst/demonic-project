document.addEventListener("DOMContentLoaded", function () {
    // Проверка авторизации
    fetch("/profile")
        .then(response => {
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

            // Проверка наличия элемента аватара
            const avatarElement = document.querySelector(".user-avatar");
            if (!avatarElement) {
                console.error("Элемент .user-avatar не найден на странице!");
                return;
            }

            // Проверка наличия аватарки в куках
            const avatarCookie = getCookie(`avatar-${user.steam_id}`);
            if (avatarCookie) {
                avatarElement.src = avatarCookie;
                console.log("Аватарка загружена из куков");
            } else {
                fetch(`/steam-avatar/${user.steam_id}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.avatarUrl) {
                            avatarElement.src = data.avatarUrl;
                            setCookie(`avatar-${user.steam_id}`, data.avatarUrl, 7);
                        } else {
                            console.warn("Аватар не найден, ставим заглушку.");
                            avatarElement.src = "/img/default-avatar.png";
                        }
                    })
                    .catch(error => {
                        console.error("Ошибка загрузки аватара:", error);
                        avatarElement.src = "/img/default-avatar.png";
                    });
            }

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
            notification.style.display = "none"; // Скрыть модальное окно (Изменено)
            body.classList.remove("blocked"); // Разблокировать страницу (Изменено)

        })
        .catch(error => {
            console.error("Ошибка авторизации:", error.message);

            // Скрываем модальное окно, если пользователь авторизован (Изменено)
            const notification = document.getElementById("auth-notification"); // Изменено
            const body = document.querySelector("body"); // Изменено

            notification.style.display = "flex"; // Изменено
            body.classList.remove("blocked"); // Разблокировать страницу (Изменено)

            // Обработчик для кнопки "Войти"
            document.getElementById("login-btn").addEventListener("click", function () {
                window.location.href = "/auth/steam"; // Перенаправляем на страницу авторизации
            });

            // Обработчик для кнопки "На главную"
            document.getElementById("home-btn").addEventListener("click", function () {
                window.location.href = "/"; // Перенаправляем на главную страницу
            });
        });
    

    
    // Обработчик кнопок в боковом меню
    document.querySelectorAll(".profile-menu-btn").forEach(button => {
        button.addEventListener("click", function () {
            const section = this.dataset.section;
            loadSection(section);
        });
    });

    function loadSection(section) {
        let content = "";
        switch (section) {
            case "cart":
                content = "<h3>Корзина</h3><p>Ваши товары...</p>";
                break;
            case "history":
                content = "<h3>История</h3><p>История покупок...</p>";
                break;
            case "finance":
                content = "<h3>Финансы</h3><p>Баланс и платежи...</p>";
                break;
            case "promocodes":
                content = "<h3>Промокоды</h3><p>Активные промокоды...</p>";
                break;
            case "messages":
                content = "<h3>Сообщения</h3><p>Ваши сообщения...</p>";
                break;
            case "freeze":
                content = "<h3>Заморозка</h3><p>Функция временной заморозки...</p>";
                break;
            case "upgrade":
                content = "<h3>Улучшение</h3><p>Опции апгрейда...</p>";
                break;
        }
        document.getElementById("dynamic-content").innerHTML = content;
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
});
