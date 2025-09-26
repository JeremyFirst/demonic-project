document.querySelector("#reset-password-form").addEventListener("submit", function (e) {
    e.preventDefault(); // Prevent default form submit

    const login = document.getElementById("login").value.trim();  // Получаем значения из полей
    const newPassword = document.getElementById("new-password").value; 
    const confirmPassword = document.getElementById("confirm-password").value; 
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    console.log(`Токен перед отправкой: ${token}`);

    console.log(`Отправка данных на сервер: login = ${login}, new_password = ${newPassword}, confirm_password = ${confirmPassword}, token = ${token}`);

    if (newPassword !== confirmPassword) {
        alert("Пароли не совпадают");
        console.log(`Пароли не совпадают. Токен: ${token}`);
        return;
    }

    fetch("/admin/reset-password", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            login: login, 
            new_password: newPassword, 
            confirm_password: confirmPassword, 
            token: token 
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log("Ответ от сервера: ", data); 
        if (data.error) {
            alert(data.error); 
        } else {
            alert(data.success); 
        }
    })
    .catch(err => {
        console.error("Ошибка запроса:", err);
        alert("Ошибка при сбросе пароля");
    });
});
