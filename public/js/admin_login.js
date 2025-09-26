document.addEventListener("DOMContentLoaded", function () {
    const welcomeMessage = document.getElementById("welcome-message");
    const loginForm = document.querySelector(".admin-login-form");

   // Проверяем, есть ли уже пользователь в сессии
fetch('/profile')
   .then(response => response.json())
   .then(user => {
       // Проверка роли пользователя на админа
       if (user.role !== "admin") {
           alert("У вас нет прав администратора.");
           window.location.href = "/";  // Перенаправляем на главную страницу
       }
       welcomeMessage.textContent = `Добро пожаловать, ${user.username}!`;
   })
   .catch(error => {
       console.error("Ошибка при загрузке профиля", error);
       welcomeMessage.textContent = "Добро пожаловать, гость!";
   });

let failedAttempts = 0;  // Счётчик неудачных попыток

    loginForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const login = document.getElementById("login").value;
        const password = document.getElementById("password").value;

        if (login.trim() === "" || password.trim() === "") {
            alert("Логин и пароль не могут быть пустыми!");
            return;
        }

        fetch("/admin/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                login: login,
                password: password
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log(data); // Логируем ответ от сервера

            if (data.error) {
                throw new Error(data.error);
            }

            // Проверка на роль admin
            if (data.role !== "admin") {
                throw new Error("Доступ запрещен. У вас нет прав администратора.");
            }

            // Если роль "admin", выводим приветствие
            document.getElementById("welcome-message").textContent = `Добро пожаловать, ${data.username}!`;

            // Перенаправляем на админ-панель
            window.location.href = "/admin_panel.html";
        })
        .catch(error => {
            alert(error.message);
            failedAttempts++; // Увеличиваем счётчик неудачных попыток

            // Если неудачных попыток больше 3, перенаправляем на главную страницу
            if (failedAttempts >= 3) {
                alert("Превышено количество попыток входа. Вы будете перенаправлены на главную.");
                window.location.href = "/"; // Перенаправляем на главную страницу
            }
        });
    });
});

document.querySelector(".btn-forgot-password").addEventListener("click", function (e) {
    e.preventDefault();
    const login = document.getElementById("login").value.trim();

    if (!login) {
        alert("Пожалуйста, введите логин для восстановления.");
        return;
    }

    fetch("/admin/request-password-reset", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ login })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
        } else if (data.info) {
            alert(data.info); // Обратитесь к Jeremy
        } else if (data.success) {
            alert(data.success); // Письмо отправлено
        }
    })
    .catch(err => {
        console.error("Ошибка запроса восстановления:", err);
        alert("Ошибка при восстановлении пароля");
    });
});

document.addEventListener("DOMContentLoaded", function () {
    // Кнопка для возврата на профиль
    const backBtn = document.getElementById("back-to-profile-btn");

    if (backBtn) {
        backBtn.addEventListener("click", function () {
            const referrer = document.referrer;  // Получаем предыдущий URL

            // Если страница профиля существует в истории переходов
            if (referrer.includes("/profile")) {
                window.location.href = "/profile.html";  // Перенаправляем на страницу профиля
            } else {
                window.location.href = "/";  // Иначе, возвращаем на главную
            }
        });
    }
});
