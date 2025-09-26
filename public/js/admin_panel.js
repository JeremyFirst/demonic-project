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
                
                // Проверяем, является ли пароль временным
                checkTempPassword(user.username);
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
        previewSection.classList.remove("show");
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

    // Переменная для отслеживания состояния предпросмотра
    let isPreviewMode = false;

    previewBtn.addEventListener("click", function () {
        if (!isPreviewMode) {
            // Показываем предпросмотр
            showPreview();
        } else {
            // Скрываем предпросмотр
            hidePreview();
        }
    });

    function showPreview() {
        const name = productNameInput.value;
        const price = productPriceInput.value;
        const description = document.getElementById("product-description").value;
        const imageFile = productImageInput.files[0];
    
        if (!name || !price || !description || !imageFile) {
            alert("Заполните все поля и загрузите изображение для предпросмотра.");
            return;
        }
    
        // Изменяем ширину модального окна
        productModal.style.width = "670px";
    
        // Показываем предпросмотр с анимацией
        setTimeout(() => {
            previewSection.classList.add("show");
        }, 50);
        
        const reader = new FileReader();
        reader.onload = function (e) {
            productPreview.innerHTML = `
                <img src="${e.target.result}" alt="${name}">
                <p><strong>${name}</strong></p>
                <p class="description">${description}</p>
                <p><strong>Цена: ${price} ₽</strong></p>
            `;
        };
        reader.readAsDataURL(imageFile);
        
        // Меняем текст кнопки
        previewBtn.textContent = "Закончить предпросмотр";
        isPreviewMode = true;
    }

    function hidePreview() {
        // Скрываем предпросмотр с анимацией
        previewSection.classList.remove("show");
        
        // Возвращаем ширину модального окна
        setTimeout(() => {
            productModal.style.width = "400px";
        }, 300); // Ждем завершения анимации
        
        // Меняем текст кнопки обратно
        previewBtn.textContent = "Предпросмотр";
        isPreviewMode = false;
    }
    

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
        
        // Сбрасываем состояние предпросмотра
        hidePreview();
        productPreview.innerHTML = "";
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
        const editGameSelect = document.getElementById("edit-game-select");
        const editCategorySelect = document.getElementById("edit-category-select");
        
        editGameSelect.value = product.game_id;  // Игра
        
        // Загружаем категории для выбранной игры
        loadCategoriesForEditGame(product.game_id, product.category_id);
    
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
    
    // Загружаем категории для первой игры
    loadCategoriesForGame(gameSelect.value);

    function fetchProducts() {
        fetch('/get-products')
            .then(response => response.json())
            .then(products => {
                displayProducts(products);
            })
            .catch(error => console.error('Ошибка при получении товаров:', error));
    }

    // Функция для загрузки категорий по игре
    function loadCategoriesForGame(gameId) {
        if (!gameId) {
            gameId = '2'; // RUST по умолчанию
        }
        
        fetch(`/get-categories-by-game/${gameId}`)
            .then(response => response.json())
            .then(categories => {
                updateCategorySelect(categories);
            })
            .catch(error => {
                console.error('Ошибка при получении категорий:', error);
                updateCategorySelect([]);
            });
    }

    // Функция для обновления селекта категорий
    function updateCategorySelect(categories) {
        categorySelect.innerHTML = '';
        
        if (categories.length === 0) {
            categorySelect.innerHTML = '<option value="">Нет категорий для этой игры</option>';
            return;
        }

        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });
    }

    // Обработчик изменения игры
    gameSelect.addEventListener('change', function() {
        loadCategoriesForGame(this.value);
    });

    // Функция для загрузки категорий в модальном окне редактирования
    function loadCategoriesForEditGame(gameId, selectedCategoryId) {
        fetch(`/get-categories-by-game/${gameId}`)
            .then(response => response.json())
            .then(categories => {
                updateEditCategorySelect(categories, selectedCategoryId);
            })
            .catch(error => {
                console.error('Ошибка при получении категорий для редактирования:', error);
                updateEditCategorySelect([], null);
            });
    }

    // Функция для обновления селекта категорий в модальном окне редактирования
    function updateEditCategorySelect(categories, selectedCategoryId) {
        const editCategorySelect = document.getElementById("edit-category-select");
        editCategorySelect.innerHTML = '';
        
        if (categories.length === 0) {
            editCategorySelect.innerHTML = '<option value="">Нет категорий для этой игры</option>';
            return;
        }

        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            if (category.id == selectedCategoryId) {
                option.selected = true;
            }
            editCategorySelect.appendChild(option);
        });
    }

    // Обработчик изменения игры в модальном окне редактирования
    document.getElementById("edit-game-select").addEventListener('change', function() {
        loadCategoriesForEditGame(this.value, null);
    });

    // ========== ФУНКЦИОНАЛ КАТЕГОРИЙ ==========

    // Элементы для работы с категориями
    const addCategoryBtn = document.getElementById("add-category-btn");
    const addCategoryModalBtn = document.getElementById("add-category");
    const categoryModal = document.getElementById("category-modal");
    const closeCategoryModalBtn = document.querySelector(".close-btn-category");
    const categoryForm = document.getElementById("category-form");
    const saveCategoryBtn = document.getElementById("save-category-btn");
    const deleteCategoryBtn = document.getElementById("delete-category-btn");
    const categoryList = document.getElementById("category-list");
    const productsSection = document.getElementById("products-section");
    const categoriesSection = document.getElementById("categories-section");
    const adminsSection = document.getElementById("admins-section");

    // Переключение между разделами
    addCategoryBtn.addEventListener("click", function() {
        showCategoriesSection();
    });

    // Возврат к товарам (можно добавить кнопку "Назад" или использовать существующую)
    document.getElementById("add-product-btn").addEventListener("click", function() {
        showProductsSection();
    });

    // Функции для переключения разделов
    function showCategoriesSection() {
        productsSection.style.display = "none";
        categoriesSection.style.display = "block";
        fetchCategories();
        // Показываем боковое меню для раздела категорий
        document.querySelector('.sidebar').style.display = "block";
        // Показываем родительский контейнер
        document.getElementById('content-area').style.display = "block";
        // Скрываем раздел администраторов
        adminsSection.style.display = "none";
        // Сохраняем состояние в localStorage
        localStorage.setItem('adminPanelSection', 'categories');
    }

    function showProductsSection() {
        categoriesSection.style.display = "none";
        productsSection.style.display = "block";
        // Показываем боковое меню для раздела товаров
        document.querySelector('.sidebar').style.display = "block";
        // Показываем родительский контейнер
        document.getElementById('content-area').style.display = "block";
        // Скрываем раздел администраторов
        adminsSection.style.display = "none";
        // Сохраняем состояние в localStorage
        localStorage.setItem('adminPanelSection', 'products');
    }

    // Восстановление состояния при загрузке страницы
    function restoreSectionState() {
        const savedSection = localStorage.getItem('adminPanelSection');
        if (savedSection === 'categories') {
            showCategoriesSection();
        } else {
            showProductsSection();
        }
    }

    // Вызываем восстановление состояния при загрузке
    restoreSectionState();

    // ========== ФУНКЦИОНАЛ НАВИГАЦИИ ==========

    // Элементы навигации
    const shopNav = document.getElementById("shop-nav");
    const adminsNav = document.getElementById("admins-nav");
    
    // Проверяем, что все элементы найдены
    if (!adminsNav) {
        console.error("Элемент #admins-nav не найден");
    }
    if (!adminsSection) {
        console.error("Элемент #admins-section не найден");
    }

    // Обработчик для кнопки "Администраторы"
    if (adminsNav) {
        adminsNav.addEventListener("click", function(event) {
            event.preventDefault();
            console.log("Клик по кнопке Администраторы");
            
            // Убираем активный класс со всех кнопок навигации
            document.querySelectorAll('.navbar a').forEach(link => {
                link.classList.remove('active-page');
            });
            
            // Добавляем активный класс к кнопке "Администраторы"
            adminsNav.classList.add('active-page');
            
            // Скрываем боковое меню
            document.querySelector('.sidebar').style.display = "none";
            
            // Скрываем родительский контейнер полностью
            document.getElementById('content-area').style.display = "none";
            
            // Показываем раздел администраторов
            if (adminsSection) {
                adminsSection.style.display = "block";
                console.log("Показываем секцию администраторов");
            } else {
                console.error("Секция администраторов не найдена");
            }
            
            // Загружаем список администраторов
            fetchAdmins();
        });
    } else {
        console.error("Кнопка Администраторы не найдена");
    }

    // Обработчик для кнопки "Магазин (ред)"
    shopNav.addEventListener("click", function(event) {
        event.preventDefault();
        
        // Убираем активный класс со всех кнопок навигации
        document.querySelectorAll('.navbar a').forEach(link => {
            link.classList.remove('active-page');
        });
        
        // Добавляем активный класс к кнопке "Магазин"
        shopNav.classList.add('active-page');
        
        // Показываем боковое меню
        document.querySelector('.sidebar').style.display = "block";
        
        // Показываем родительский контейнер
        document.getElementById('content-area').style.display = "block";
        
        // Скрываем раздел администраторов
        adminsSection.style.display = "none";
        
        // Показываем раздел товаров
        productsSection.style.display = "block";
    });

    // Открытие модального окна для добавления категории
    addCategoryModalBtn.addEventListener("click", function() {
        categoryModal.classList.add("show");
        document.getElementById("category-modal-title").textContent = "Добавить категорию";
        document.getElementById("category-id").value = "";
        document.getElementById("category-name").value = "";
        document.getElementById("category-description").value = "";
        document.getElementById("category-game-select").value = "1";
        deleteCategoryBtn.style.display = "none";
        saveCategoryBtn.textContent = "Создать категорию";
    });

    // Закрытие модального окна категории
    closeCategoryModalBtn.addEventListener("click", function() {
        categoryModal.classList.remove("show");
    });

    // Закрытие по Escape
    document.addEventListener("keydown", function(event) {
        if (event.key === "Escape") {
            categoryModal.classList.remove("show");
        }
    });

    // Предотвращение стандартной отправки формы
    categoryForm.addEventListener("submit", function(event) {
        event.preventDefault(); // Предотвращаем перезагрузку страницы
        saveCategory();
    });

    // Сохранение категории
    function saveCategory() {
        const categoryId = document.getElementById("category-id").value;
        const categoryName = document.getElementById("category-name").value;
        const categoryDescription = document.getElementById("category-description").value;
        const gameId = document.getElementById("category-game-select").value;

        if (!categoryName.trim()) {
            alert("Введите название категории");
            return;
        }

        const categoryData = {
            name: categoryName,
            description: categoryDescription,
            game_id: gameId
        };

        if (categoryId) {
            // Редактирование существующей категории
            fetch(`/edit-category/${categoryId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(categoryData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.message) {
                    alert(data.message);
                    fetchCategories();
                    categoryModal.classList.remove("show");
                } else {
                    alert(data.error || 'Ошибка при обновлении категории');
                }
            })
            .catch(error => {
                console.error('Ошибка при обновлении категории:', error);
                alert('Ошибка при обновлении категории');
            });
        } else {
            // Добавление новой категории
            fetch('/add-category', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(categoryData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.message) {
                    alert(data.message);
                    fetchCategories();
                    categoryModal.classList.remove("show");
                } else {
                    alert(data.error || 'Ошибка при добавлении категории');
                }
            })
            .catch(error => {
                console.error('Ошибка при добавлении категории:', error);
                alert('Ошибка при добавлении категории');
            });
        }
    }

    // Обработчик для кнопки сохранения (для совместимости)
    saveCategoryBtn.addEventListener("click", function(event) {
        event.preventDefault();
        saveCategory();
    });

    // Удаление категории
    deleteCategoryBtn.addEventListener("click", function() {
        const categoryId = document.getElementById("category-id").value;
        
        if (!categoryId) return;

        if (confirm("Вы уверены, что хотите удалить эту категорию?")) {
            fetch(`/delete-category/${categoryId}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.message) {
                    alert(data.message);
                    fetchCategories();
                    categoryModal.classList.remove("show");
                } else {
                    alert(data.error || 'Ошибка при удалении категории');
                }
            })
            .catch(error => {
                console.error('Ошибка при удалении категории:', error);
                alert('Ошибка при удалении категории');
            });
        }
    });

    // Функция для отображения категорий
    function displayCategories(categories) {
        categoryList.innerHTML = '';
        
        if (categories.length === 0) {
            categoryList.innerHTML = '<p>Категории не найдены. Добавьте первую категорию!</p>';
            return;
        }

        categories.forEach(category => {
            const categoryItem = document.createElement('div');
            categoryItem.classList.add('category-item');
            categoryItem.innerHTML = `
                <div class="category-info">
                    <h4>${category.name}</h4>
                    <p><strong>Игра:</strong> ${category.game_name || 'Не указана'}</p>
                    <p><strong>Описание:</strong> ${category.description || 'Нет описания'}</p>
                </div>
                <div class="category-actions">
                    <button class="edit-category-btn" data-id="${category.id}">Редактировать</button>
                </div>
            `;
            
            // Обработчик для редактирования
            const editBtn = categoryItem.querySelector('.edit-category-btn');
            editBtn.addEventListener('click', () => {
                openEditCategoryModal(category);
            });
            
            categoryList.appendChild(categoryItem);
        });
    }

    // Функция для открытия модального окна редактирования категории
    function openEditCategoryModal(category) {
        document.getElementById("category-modal-title").textContent = "Редактировать категорию";
        document.getElementById("category-id").value = category.id;
        document.getElementById("category-name").value = category.name;
        document.getElementById("category-description").value = category.description || '';
        document.getElementById("category-game-select").value = category.game_id;
        deleteCategoryBtn.style.display = "block";
        saveCategoryBtn.textContent = "Сохранить изменения";
        
        categoryModal.classList.add("show");
    }

    // Функция для получения категорий с сервера
    function fetchCategories() {
        fetch('/get-categories')
            .then(response => response.json())
            .then(categories => {
                displayCategories(categories);
            })
            .catch(error => {
                console.error('Ошибка при получении категорий:', error);
                categoryList.innerHTML = '<p>Ошибка при загрузке категорий</p>';
            });
    }

    // ========== ФУНКЦИОНАЛ АДМИНИСТРАТОРОВ ==========

    // Элементы для работы с администраторами
    const addAdminBtn = document.getElementById("add-admin");
    const adminModal = document.getElementById("admin-modal");
    const closeAdminModalBtn = document.querySelector(".close-btn-admin");
    const adminForm = document.getElementById("admin-form");
    const saveAdminBtn = document.getElementById("save-admin-btn");
    const deleteAdminBtn = document.getElementById("delete-admin-btn");
    const adminList = document.getElementById("admin-list");

    // Открытие модального окна для добавления администратора
    addAdminBtn.addEventListener("click", function() {
        adminModal.classList.add("show");
        document.getElementById("admin-modal-title").textContent = "Добавить администратора";
        document.getElementById("admin-id").value = "";
        document.getElementById("admin-user-select").value = "";
        document.getElementById("admin-role-select").value = "admin";
        deleteAdminBtn.style.display = "none";
        saveAdminBtn.textContent = "Добавить администратора";
        
        // Загружаем список пользователей
        fetchUsers();
    });

    // Закрытие модального окна администратора
    closeAdminModalBtn.addEventListener("click", function() {
        adminModal.classList.remove("show");
    });

    // Предотвращение стандартной отправки формы
    adminForm.addEventListener("submit", function(event) {
        event.preventDefault();
        saveAdmin();
    });

    // Сохранение администратора
    function saveAdmin() {
        const adminId = document.getElementById("admin-id").value;
        const userId = document.getElementById("admin-user-select").value;
        const role = document.getElementById("admin-role-select").value;

        if (!userId) {
            alert("Выберите пользователя");
            return;
        }

        const adminData = {
            user_id: userId,
            role: role
        };

        if (adminId) {
            // Редактирование существующего администратора
            fetch(`/edit-admin/${adminId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(adminData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.message) {
                    alert(data.message);
                    fetchAdmins();
                    adminModal.classList.remove("show");
                } else {
                    alert(data.error || 'Ошибка при обновлении администратора');
                }
            })
            .catch(error => {
                console.error('Ошибка при обновлении администратора:', error);
                alert('Ошибка при обновлении администратора');
            });
        } else {
            // Добавление нового администратора
            fetch('/add-admin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(adminData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.message) {
                    // Показываем временный пароль
                    const tempPassword = data.tempPassword;
                    alert(`${data.message}\n\nВременный пароль: ${tempPassword}\n\nСохраните этот пароль! Администратор должен использовать его для первого входа.`);
                    fetchAdmins();
                    adminModal.classList.remove("show");
                } else {
                    alert(data.error || 'Ошибка при добавлении администратора');
                }
            })
            .catch(error => {
                console.error('Ошибка при добавлении администратора:', error);
                alert('Ошибка при добавлении администратора');
            });
        }
    }

    // Удаление администратора
    deleteAdminBtn.addEventListener("click", function() {
        const adminId = document.getElementById("admin-id").value;
        
        if (!adminId) return;

        if (confirm("Вы уверены, что хотите удалить этого администратора?")) {
            fetch(`/delete-admin/${adminId}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.message) {
                    alert(data.message);
                    fetchAdmins();
                    adminModal.classList.remove("show");
                } else {
                    alert(data.error || 'Ошибка при удалении администратора');
                }
            })
            .catch(error => {
                console.error('Ошибка при удалении администратора:', error);
                alert('Ошибка при удалении администратора');
            });
        }
    });

    // Функция для отображения администраторов
    function displayAdmins(admins) {
        adminList.innerHTML = '';
        
        if (admins.length === 0) {
            adminList.innerHTML = '<p>Администраторы не найдены. Добавьте первого администратора!</p>';
            return;
        }

        admins.forEach(admin => {
            const adminItem = document.createElement('div');
            adminItem.classList.add('admin-item');
            adminItem.innerHTML = `
                <div class="admin-info">
                    <h4>${admin.username}</h4>
                    <p><strong>Роль:</strong> ${admin.role === 'superadmin' ? 'Супер-администратор' : 'Администратор'}</p>
                    <p><strong>Дата создания:</strong> ${new Date(admin.created_at).toLocaleDateString()}</p>
                </div>
                <div class="admin-actions">
                    <button class="edit-admin-btn" data-id="${admin.id}">Редактировать</button>
                </div>
            `;
            
            // Обработчик для редактирования
            const editBtn = adminItem.querySelector('.edit-admin-btn');
            editBtn.addEventListener('click', () => {
                openEditAdminModal(admin);
            });
            
            adminList.appendChild(adminItem);
        });
    }

    // Функция для открытия модального окна редактирования администратора
    function openEditAdminModal(admin) {
        document.getElementById("admin-modal-title").textContent = "Редактировать администратора";
        document.getElementById("admin-id").value = admin.id;
        document.getElementById("admin-role-select").value = admin.role;
        deleteAdminBtn.style.display = "block";
        saveAdminBtn.textContent = "Сохранить изменения";
        
        // Загружаем пользователей и устанавливаем текущего
        fetchUsers().then(() => {
            document.getElementById("admin-user-select").value = admin.user_id;
        });
        
        adminModal.classList.add("show");
    }

    // Функция для получения администраторов с сервера
    function fetchAdmins() {
        fetch('/get-admins')
            .then(response => response.json())
            .then(admins => {
                displayAdmins(admins);
            })
            .catch(error => {
                console.error('Ошибка при получении администраторов:', error);
                adminList.innerHTML = '<p>Ошибка при загрузке администраторов</p>';
            });
    }

    // Функция для получения пользователей с сервера
    function fetchUsers() {
        return fetch('/get-users')
            .then(response => response.json())
            .then(users => {
                const userSelect = document.getElementById("admin-user-select");
                userSelect.innerHTML = '<option value="">Выберите пользователя</option>';
                
                users.forEach(user => {
                    const option = document.createElement('option');
                    option.value = user.id;
                    option.textContent = user.username;
                    userSelect.appendChild(option);
                });
            })
            .catch(error => {
                console.error('Ошибка при получении пользователей:', error);
            });
    }

    // ========== ФУНКЦИОНАЛ СМЕНЫ ПАРОЛЯ ==========
    
    // Функция для проверки временного пароля
    function checkTempPassword(username) {
        fetch(`/check-temp-password/${username}`)
            .then(response => response.json())
            .then(data => {
                console.log("isTempPassword значение:", data.isTempPassword, "тип:", typeof data.isTempPassword);
                if (data.isTempPassword === true || data.isTempPassword === 1) {
                    console.log("Показываем модальное окно смены пароля");
                    showChangePasswordModal(username);
                } else {
                    console.log("Пароль не временный, модальное окно не показываем");
                }
            })
            .catch(error => {
                console.error("Ошибка при проверке временного пароля:", error);
            });
    }
    
    // Функция для показа модального окна смены пароля
    function showChangePasswordModal(username) {
        console.log("Функция showChangePasswordModal вызвана для пользователя:", username);
        // Создаем модальное окно
        const modal = document.createElement('div');
        modal.id = 'change-password-modal';
        modal.className = 'show';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Смена пароля</h3>
                    <span class="close-btn">&times;</span>
                </div>
                <div class="modal-body">
                    <p>Вы вошли с временным паролем. Пожалуйста, смените его на постоянный.</p>
                    <form id="change-password-form">
                        <div class="form-group">
                            <label for="current-password">Текущий пароль:</label>
                            <input type="password" id="current-password" required>
                        </div>
                        <div class="form-group">
                            <label for="new-password">Новый пароль:</label>
                            <input type="password" id="new-password" required minlength="6">
                        </div>
                        <div class="form-group">
                            <label for="confirm-password">Подтвердите пароль:</label>
                            <input type="password" id="confirm-password" required minlength="6">
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">Сменить пароль</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        console.log("Модальное окно добавлено в DOM");
        
        // Проверяем стили модального окна
        const modalElement = document.getElementById('change-password-modal');
        const computedStyle = window.getComputedStyle(modalElement);
        console.log("Модальное окно стили:", {
            display: computedStyle.display,
            position: computedStyle.position,
            zIndex: computedStyle.zIndex,
            width: computedStyle.width,
            height: computedStyle.height
        });
        
        // Обработчики событий
        const closeBtn = modal.querySelector('.close-btn');
        const form = modal.querySelector('#change-password-form');
        
        closeBtn.addEventListener('click', () => {
            modal.remove();
        });
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            
            if (newPassword !== confirmPassword) {
                alert('Пароли не совпадают!');
                return;
            }
            
            if (newPassword.length < 6) {
                alert('Пароль должен содержать минимум 6 символов!');
                return;
            }
            
            try {
                // Получаем ID администратора
                const adminResponse = await fetch(`/get-admin-id/${username}`);
                const adminData = await adminResponse.json();
                
                if (!adminData.adminId) {
                    alert('Ошибка при получении данных администратора');
                    return;
                }
                
                // Меняем пароль
                const response = await fetch('/change-admin-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        adminId: adminData.adminId,
                        currentPassword: currentPassword,
                        newPassword: newPassword
                    })
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    alert('Пароль успешно изменен!');
                    modal.remove();
                } else {
                    alert(result.error || 'Ошибка при смене пароля');
                }
            } catch (error) {
                console.error('Ошибка при смене пароля:', error);
                alert('Ошибка при смене пароля');
            }
        });
    }
});
