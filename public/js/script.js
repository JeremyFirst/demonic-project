let currentIndex = 0;
const projectBlocks = document.querySelectorAll('.project-block');
const projectCards = document.querySelectorAll('.project-card');
const projectDescriptions = document.querySelectorAll('.project-description');
const navigationDots = document.querySelectorAll('.dot');

// Функция для установки куки
function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000)); // Устанавливаем срок действия
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

// Функция для получения куки по имени
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

// Функция для удаления куки
function deleteCookie(name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}

// Функция для показа текущего блока
function showCard(index) {
    if (index >= projectBlocks.length) {
        currentIndex = 0;
    } else if (index < 0) {
        currentIndex = projectBlocks.length - 1;
    } else {
        currentIndex = index;
    }

    // Скрываем все блоки, карточки и описания
    projectBlocks.forEach(block => block.classList.remove('active'));
    projectCards.forEach(card => card.classList.remove('active'));
    projectDescriptions.forEach(desc => desc.classList.remove('active'));
    navigationDots.forEach(dot => dot.classList.remove('active'));

    // Показываем текущий блок
    projectBlocks[currentIndex].classList.add('active');
    projectCards[currentIndex].classList.add('active');
    projectDescriptions[currentIndex].classList.add('active');
}

// Функция для сброса автопрокрутки
function restartAutoSwipe() {
    clearInterval(autoSwipeInterval);
    autoSwipeInterval = setInterval(() => {
        showCard(currentIndex + 1);
    }, 25000); // Каждые 25 секунд переключается на следующую карточку
}

// Обработчики для кнопок переключения
document.querySelector('.prev-btn').addEventListener('click', () => {
    showCard(currentIndex - 1);
    restartAutoSwipe(); // Перезапускаем автопрокрутку при ручном переключении
});

document.querySelector('.next-btn').addEventListener('click', () => {
    showCard(currentIndex + 1);
    restartAutoSwipe(); // Перезапускаем автопрокрутку при ручном переключении
});

// Добавляем обработчики для точек навигации
navigationDots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
        showCard(index);
        restartAutoSwipe(); // Перезапускаем автопрокрутку при ручном переключении
    });
});

// Автопрокрутка
let autoSwipeInterval;
restartAutoSwipe(); // Запускаем автопрокрутку при загрузке страницы

document.addEventListener("DOMContentLoaded", function () {
    // Проверяем, авторизован ли пользователь
    fetch('/profile')
        .then(response => {
            if (response.ok) {
                return response.json(); // Возвращаем данные пользователя
            } else {
                throw new Error("Не авторизован");
            }
        })
        .then(user => {
            console.log("Пользователь загружен:", user);

            // Проверка правильности Steam ID
            const steamId = user.steam_id;
            if (steamId.length !== 17) {
                console.error("Неверный формат Steam ID", steamId);
                return;
            }

            // Отображаем никнейм на странице
            document.querySelector(".profile-info").style.display = "flex";
            document.querySelector(".profile-name").textContent = user.username;
            document.querySelector(".profile-name").href = "/profile.html";
            document.querySelector("#auth-btn").style.display = "none"; // Скрыть кнопку "Авторизация"

            // Загружаем аватар через промежуточный сервер, сначала проверим куки
            const avatarCookie = getCookie(`avatar-${steamId}`);
            const avatarElement = document.querySelector(".profile-avatar");

            if (avatarCookie) {
                // Если аватарка есть в куках, сразу отображаем
                avatarElement.src = avatarCookie;
            } else {
                // Если нет, запрашиваем аватарку с сервера
                fetch(`/steam-avatar/${steamId}`)
                    .then(response => response.json()) // Получаем URL аватара от сервера
                    .then(data => {
                        if (data.avatarUrl) {
                            avatarElement.src = data.avatarUrl; // Устанавливаем аватар
                            setCookie(`avatar-${steamId}`, data.avatarUrl, 7); // Сохраняем аватарку в куки на 7 дней
                        }
                    })
                    .catch(error => {
                        console.error("Ошибка загрузки аватара:", error); // Логируем ошибку
                        avatarElement.src = "/img/default-avatar.png"; // Заглушка
                    });
            }
        })
        .catch(error => {
            console.log("Ошибка авторизации:", error.message);
            document.querySelector("#auth-btn").style.display = "block"; // Показать кнопку "Авторизация"
        });

    // Изначальная настройка
    showCard(currentIndex);
    changeNews('Новости проекта'); // Устанавливаем новости проекта как дефолтные

    // Обработчик для клика на иконки
    document.querySelectorAll('.game-icon-placeholder').forEach((icon, index) => {
        icon.addEventListener('click', () => {
            switch (index) {
                case 0: // Иконка для Rust
                    changeNews('Новости RUST');
                    break;
                case 1: // Иконка для Minecraft
                    changeNews('Новости Minecraft');
                    break;
                case 2: // Иконка для SCP
                    changeNews('Новости SCP');
                    break;
                default:
                    changeNews('Новости');
            }
        });
    });

    // Функция для изменения новостей
    function changeNews(newsTitle) {
        document.querySelector('.news-title').textContent = newsTitle;
        const newsImage = document.querySelector('.news-image');
        const newsText = document.querySelector('.news-text p');

        // Меняем содержание новости в зависимости от заголовка
        if (newsTitle === 'Новости RUST') {
            newsImage.src = 'img/rust-news.jpg';  // Пример изображения для новостей RUST
            newsText.textContent = 'Специальные новости для RUST...';
        } else if (newsTitle === 'Новости Minecraft') {
            newsImage.src = 'img/minecraft-news.jpg';  // Пример изображения для Minecraft
            newsText.textContent = 'Специальные новости для Minecraft...';
        } else if (newsTitle === 'Новости SCP') {
            newsImage.src = 'img/scp-news.jpg';  // Пример изображения для SCP
            newsText.textContent = 'Специальные новости для SCP...';
        } else {
            newsImage.src = 'img/default-news-image.png';  // Общее изображение
            newsText.textContent = 'Общие новости проекта...';
        }

        // Показать/скрыть кнопку "Вернуться к новостям проекта"
        if (newsTitle !== 'Новости проекта') {
            document.getElementById('back-to-project-news').style.display = 'inline-block'; // Показать кнопку
        } else {
            document.getElementById('back-to-project-news').style.display = 'none'; // Скрыть кнопку
        }
    }

    // Обработчик для кнопки "Вернуться к новостям проекта"
    document.getElementById('back-to-project-news').addEventListener('click', () => {
        changeNews('Новости проекта'); // Вернуться к общим новостям
    });

    // Модальное окно подписки
    function checkAuthorization() {
        return fetch('/profile') // Запрос на сервер, чтобы проверить, авторизован ли пользователь
            .then(response => {
                if (response.ok) {
                    return response.json(); // Возвращаем данные пользователя
                } else {
                    throw new Error("Не авторизован");
                }
            })
            .catch(error => {
                console.log("Ошибка при проверке авторизации:", error);
                return null;
            });
    }

    // Открытие модального окна при клике на кнопку подписки
    document.getElementById('subscribe-btn').addEventListener('click', function () {
        checkAuthorization().then(user => {
            if (user) {
                // Пользователь авторизован, показываем модальное окно
                document.getElementById('subscribe-modal').style.display = 'flex';
            } else {
                alert("Вы должны авторизоваться, чтобы подписаться на рассылку!");
            }
        });
    });

    // Валидация почты и отправка на сервер
    document.getElementById('submit-email').addEventListener('click', function () {
        const email = document.getElementById('email').value;  // Получаем введенный email

        // Логируем введенный email
        console.log('Введенный email:', email);

        // Валидация email
        if (!email) {
            alert("Пожалуйста, введите email.");
            console.log('Ошибка: email не введен');
            return;
        }

        const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
        if (!emailPattern.test(email)) {
            alert("Пожалуйста, введите правильный email.");
            console.log('Ошибка: неверный формат email');
            return;
        }

        // Проверяем авторизацию перед отправкой данных
        checkAuthorization().then(user => {
            if (user) {
                console.log('Пользователь авторизован:', user);

                // Отправляем запрос на сервер для обновления email
                fetch('/profile/update-email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: email,
                        userId: user.id  // Отправляем ID пользователя
                    })
                })
                    .then(response => response.json())
                    .then(data => {
                        console.log('Ответ от сервера:', data);
                        alert(data.message);  // Выводим сообщение об успешной подписке
                        document.getElementById('email').value = '';  // Очистить поле email
                        document.getElementById('subscribe-modal').style.display = 'none';  // Закрыть модальное окно
                    })
                    .catch(error => {
                        console.error('Ошибка при подписке:', error);
                        alert('Произошла ошибка при подписке.');
                    });
            } else {
                alert("Вы должны авторизоваться, чтобы подписаться на рассылку!");
                console.log('Ошибка: пользователь не авторизован');
            }
        });
    });

    // Закрытие модального окна
    document.querySelector('.close-btn').addEventListener('click', function () {
        document.getElementById('subscribe-modal').style.display = 'none';
    });
});