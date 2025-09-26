document.addEventListener("DOMContentLoaded", function () {
    // Проверка авторизации
    fetch("/profile")
        .then(response => {
            if (!response.ok) {
                window.location.href = "/admin_login.html";
            }
            return response.json();
        })
        .then(user => {
            if (user && user.role === 'admin') {
                console.log("Пользователь авторизован:", user);
                // Показываем приветствие
                document.title = `Админ панель - ${user.username}`;
            } else {
                window.location.href = "/admin_login.html";
            }
        })
        .catch(error => {
            console.error("Ошибка при авторизации:", error);
            window.location.href = "/admin_login.html";
        });

    const addProductBtn = document.getElementById("add-product");
    const productModal = document.getElementById("product-modal");
    const saveProductBtn = document.getElementById("save-product-btn");
    const previewBtn = document.getElementById("preview-btn");
    const clearBtn = document.getElementById("clear-btn");
    const closeModalBtnAdd = document.querySelector(".close-btn-add") || document.querySelector("#product-modal .close-btn");
    const closeModalBtnEdit = document.querySelector(".close-btn-edit") || document.querySelector("#edit-product-modal .close-btn");
    const previewSection = document.getElementById("preview-section");
    const productPreview = document.getElementById("product-preview");
    const productNameInput = document.getElementById("product-name");
    const productPriceInput = document.getElementById("product-price");
    const productImageInput = document.getElementById("product-image");
    const fileNameDisplay = document.getElementById("file-name");
    const productList = document.getElementById("product-list");
    const gameSelect = document.getElementById("game-select");
    const categorySelect = document.getElementById("category-select");
    const changeImageBtn = document.getElementById("change-image-btn");
    const editProductImage = document.getElementById("edit-product-image");
    const imageInput = document.getElementById("edit-product-image-upload");
    const editProductBtn = document.getElementById("edit-product-btn");  // Кнопка редактирования товара
    const deleteProductBtn = document.getElementById("delete-product-btn"); 

    let productImage = null;

    productModal.classList.remove("show");
    document.getElementById("edit-product-modal").classList.remove("show");

    function displayProducts(products) {
        productList.innerHTML = '';
        products.forEach(product => {
            const productItem = document.createElement('div');
            productItem.classList.add('product-item');
            productItem.dataset.productId = product.id;
            productItem.innerHTML = `
                <img src="${product.image_url}" alt="${product.name}" class="product-image">
                <h5 class="product-name">${product.name}</h5>
                <p class="product-description">${product.description}</p>
                <p class="product-price">${product.price} ₽</p>
            `;
            productItem.addEventListener("click", () => {
                openEditProductModal(product);
            });
            productList.appendChild(productItem);
        });
    }

    addProductBtn.addEventListener("click", function () {
        if (document.getElementById("edit-product-modal").classList.contains("show")) return;

        productModal.classList.add("show");
        document.getElementById("edit-product-id").value = "";
        productImage = null;
        fileNameDisplay.textContent = "Файл не выбран";
        productNameInput.value = "";
        productPriceInput.value = "";
        document.getElementById("product-description").value = "";
        productImageInput.value = "";
        previewSection.style.display = "none";
        productPreview.innerHTML = "";
    });

    closeModalBtnAdd.addEventListener("click", function () {
        productModal.classList.remove("show");
        productModal.style.width = "400px";
    });

    closeModalBtnEdit.addEventListener("click", function () {
        document.getElementById("edit-product-modal").classList.remove("show");
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            productModal.classList.remove("show");
            productModal.style.width = "400px";
            document.getElementById("edit-product-modal").classList.remove("show");
        }
    });

    previewBtn.addEventListener("click", function () {
        const name = productNameInput.value;
        const price = productPriceInput.value;
        const description = document.getElementById("product-description").value;
        const imageFile = productImageInput.files[0];
    
        if (!name || !price || !description || !imageFile) {
            alert("Заполните все поля и загрузите изображение для предпросмотра.");
            return;
        }
    
        // Сразу изменяем ширину модального окна
        productModal.style.width = "670px"; // Устанавливаем ширину на 670px
    
        // Теперь показываем предпросмотр товара
        previewSection.style.display = "block"; // Показываем раздел предпросмотра
        const reader = new FileReader();
        reader.onload = function (e) {
            productPreview.innerHTML = `
                <img src="${e.target.result}" alt="${name}" style="width:150px; height:150px; object-fit:cover; border-radius:10px;">
                <p><strong>${name}</strong></p>
                <p>${description}</p>
                <p>${price} ₽</p>
            `;
        };
        reader.readAsDataURL(imageFile);
    });
    

    productImageInput.addEventListener("change", function () {
        const file = productImageInput.files[0];
        fileNameDisplay.textContent = file ? file.name : "Файл не выбран";
    });

    clearBtn.addEventListener("click", function () {
        productNameInput.value = "";
        productPriceInput.value = "";
        document.getElementById("product-description").value = "";
        productImageInput.value = "";
        fileNameDisplay.textContent = "Файл не выбран";
        previewSection.style.display = "none";
        productPreview.innerHTML = "";
        productModal.style.width = "400px";
    });

    saveProductBtn.addEventListener("click", function () {
        const productName = productNameInput.value;
        let productPrice = productPriceInput.value.trim();
        const productDescription = document.getElementById("product-description").value;
        const productImage = productImageInput.files[0];

        if (productPrice === "" || isNaN(productPrice) || productPrice <= 0) {
            alert("Пожалуйста, укажите корректную цену товара.");
            return;
        }

        productPrice = productPrice.replace(/[^\d.-]/g, '');

        const formData = new FormData();
        formData.append("name", productName);
        formData.append("price", productPrice);
        formData.append("description", productDescription);
        formData.append("product-image", productImage);
        formData.append("game_id", gameSelect.value);
        formData.append("category_id", categorySelect.value);

        fetch('/add-product', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(response => {
                alert(response.message);
                fetchProducts();
                productModal.classList.remove("show");
            })
            .catch(error => console.error('Ошибка при добавлении товара:', error));
    });

    function openEditProductModal(product) {
        // Заполняем поля модального окна данными товара
        document.getElementById("edit-product-id").value = product.id;  // ID товара
        document.getElementById("edit-product-name").value = product.name;  // Название товара
        document.getElementById("edit-product-price").value = product.price;  // Цена товара
        document.getElementById("edit-product-description").value = product.description;  // Описание товара
    
        // Если изображение товара есть, показываем его
        const editProductImage = document.getElementById("edit-product-image");
        editProductImage.src = product.image_url;  // Устанавливаем URL изображения
        editProductImage.style.display = "block";  // Показываем изображение
    
        // Заполняем поля с игрой и категорией
        document.getElementById("edit-game-select").value = product.game_id;  // Игра
        document.getElementById("edit-category-select").value = product.category_id;  // Категория
    
        // Открываем модальное окно редактирования
        document.getElementById("edit-product-modal").classList.add("show");  // Показываем модальное окно редактирования
    }

    changeImageBtn.addEventListener("click", function () {
        imageInput.click();  // Открываем диалог выбора файла
    });
    
    // Когда пользователь выбирает изображение
    imageInput.addEventListener("change", function (event) {
        const file = event.target.files[0];  // Получаем выбранный файл
    
        if (file) {
            const reader = new FileReader();  // Создаем новый FileReader
    
            reader.onload = function (e) {
                // Устанавливаем новое изображение в элемент <img>
                editProductImage.src = e.target.result;
                editProductImage.style.display = "block";  // Показываем изображение
    
                // Сохраняем URL изображения в переменную
                imageUrl = e.target.result;  // Это будет URL изображения
            };
    
            reader.readAsDataURL(file);  // Читаем файл как Data URL
        }
    });

    editProductBtn.onclick = function () {
        // Получаем данные из формы
        const productId = document.getElementById("edit-product-id").value;  // ID товара
        const productName = document.getElementById("edit-product-name").value;  // Название товара
        const productPrice = document.getElementById("edit-product-price").value;  // Цена товара
        const productDescription = document.getElementById("edit-product-description").value;  // Описание товара
        const productImage = document.getElementById("edit-product-image").src;  // Изображение товара
        const gameId = document.getElementById("edit-game-select").value;  // Игра
        const categoryId = document.getElementById("edit-category-select").value;  // Категория товара
    
        // Создаем объект с новыми данными товара
        const updatedProduct = {
            name: productName,
            price: productPrice,
            description: productDescription,
            image_url: productImage,
            game_id: gameId,
            category_id: categoryId,
            image_url: imageUrl  
        };
    
        console.log("Отправка PUT-запроса на редактирование товара с данными:", updatedProduct);
    
        // Отправляем PUT-запрос для обновления товара
        fetch(`/edit-product/${productId}`, {
            method: 'PUT',  // Метод PUT для обновления
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedProduct)  // Отправляем обновленные данные
        })
        .then(response => response.json())
        .then(data => {
            console.log("Ответ от сервера:", data);  // Логируем ответ от сервера
            if (data.message === 'Товар обновлен!') {
                alert('Товар успешно обновлен');
                fetchProducts(); // Обновляем список товаров
                document.getElementById("edit-product-modal").classList.remove("show"); // Закрываем окно редактирования
            } else {
                alert('Ошибка при обновлении товара');
            }
        })
        .catch(error => console.error('Ошибка при обновлении товара:', error));
    };

    deleteProductBtn.onclick = function () {
        const productId = document.getElementById("edit-product-id").value;  // Получаем ID товара
    
        console.log(`Отправка DELETE-запроса для удаления товара с ID: ${productId}`);
    
        // Отправляем DELETE-запрос для удаления товара
        fetch(`/delete-product/${productId}`, {
            method: 'DELETE',  // Метод DELETE
        })
        .then(response => response.json())
        .then(data => {
            console.log("Ответ от сервера при удалении:", data);  // Логируем ответ от сервера
            if (data.message === 'Товар удален') {
                alert('Товар успешно удален');
                fetchProducts(); // Обновляем список товаров
                document.getElementById("edit-product-modal").classList.remove("show"); // Закрываем окно
            } else {
                alert('Ошибка при удалении товара');
            }
        })
        .catch(error => console.error('Ошибка при удалении товара:', error));
    };
    
    fetchProducts();

    function fetchProducts() {
        fetch('/get-products')
            .then(response => response.json())
            .then(products => {
                displayProducts(products);
            })
            .catch(error => console.error('Ошибка при получении товаров:', error));
    }
});
