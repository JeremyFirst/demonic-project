// Глобальные переменные для поиска
let allDiscounts = [];
let allProducts = [];
let allCategories = [];
let allAdmins = [];
let allPromocodes = [];
let allGames = [];

// Глобальные DOM элементы
let promocodesSection;

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
    const editProductBtn = document.getElementById("edit-product-btn");
    const deleteProductBtn = document.getElementById("delete-product-btn"); 


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
                <p class="product-price">${product.price} ₽</p>
            `;
            productItem.addEventListener("click", () => {
                openEditProductModal(product);
            });
            productList.appendChild(productItem);
        });
    }

    // Функция поиска товаров (только по названию)
    function searchProducts(searchTerm) {
        if (!searchTerm.trim()) {
            displayProducts(allProducts);
            return;
        }

        const filtered = allProducts.filter(product => {
            const name = product.name.toLowerCase();
            const search = searchTerm.toLowerCase();
            
            return name.includes(search);
        });

        displayProducts(filtered);
    }

    addProductBtn.addEventListener("click", function () {
        if (document.getElementById("edit-product-modal").classList.contains("show")) return;

        productModal.classList.add("show");
        document.getElementById("edit-product-id").value = "";
        fileNameDisplay.textContent = "Файл не выбран";
        productNameInput.value = "";
        productPriceInput.value = "";
        document.getElementById("product-description").value = "";
        productImageInput.value = "";
        // Полный сброс состояния предпросмотра
        hidePreview();
    });

    closeModalBtnAdd.addEventListener("click", function () {
        productModal.classList.remove("show");
        productModal.style.width = "400px";
        // Сбрасываем состояние предпросмотра
        hidePreview();
    });

    closeModalBtnEdit.addEventListener("click", function () {
        document.getElementById("edit-product-modal").classList.remove("show");
    });

    // Общий обработчик Escape для всех модальных окон
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            if (productModal.classList.contains("show")) {
                productModal.classList.remove("show");
                productModal.style.width = "400px";
                hidePreview(); // Сбрасываем предпросмотр при закрытии модального окна товара
            }
            document.getElementById("edit-product-modal").classList.remove("show");
            categoryModal.classList.remove("show");
            discountModal.classList.remove("show");
            adminModal.classList.remove("show");
            promocodeModal.classList.remove("show");
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
        const imageFile = productImageInput.files[0];
    
        if (!name || !price || !imageFile) {
            alert("Заполните название, цену и загрузите изображение для предпросмотра.");
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
                // Сбрасываем состояние предпросмотра
                hidePreview();
            })
            .catch(error => console.error('Ошибка при добавлении товара:', error));
    });

    function openEditProductModal(product) {
        document.getElementById("edit-product-id").value = product.id;
        document.getElementById("edit-product-name").value = product.name;
        document.getElementById("edit-product-price").value = product.price;
        document.getElementById("edit-product-description").value = product.description;
    
        const editProductImage = document.getElementById("edit-product-image");
        editProductImage.src = product.image_url;
        editProductImage.style.display = "block";
    
        const editGameSelect = document.getElementById("edit-game-select");
        const editCategorySelect = document.getElementById("edit-category-select");
        
        editGameSelect.value = product.game_id;
        
        // Сбрасываем imageUrl при открытии модального окна
        window.imageUrl = null;
        
        loadCategoriesForEditGame(product.game_id, product.category_id);
    
        document.getElementById("edit-product-modal").classList.add("show");
    }

    changeImageBtn.addEventListener("click", function () {
        imageInput.click();
    });
    
    imageInput.addEventListener("change", function (event) {
        const file = event.target.files[0];
    
        if (file) {
            const reader = new FileReader();
    
            reader.onload = function (e) {
                editProductImage.src = e.target.result;
                editProductImage.style.display = "block";
    
                window.imageUrl = e.target.result;
            };
    
            reader.readAsDataURL(file);
        }
    });

    editProductBtn.onclick = function () {
        const productId = document.getElementById("edit-product-id").value;
        const productName = document.getElementById("edit-product-name").value;
        const productPrice = document.getElementById("edit-product-price").value;
        const productDescription = document.getElementById("edit-product-description").value;
        const productImage = document.getElementById("edit-product-image").src;
        const gameId = document.getElementById("edit-game-select").value;
        const categoryId = document.getElementById("edit-category-select").value;
    
        const updatedProduct = {
            name: productName,
            price: productPrice,
            description: productDescription,
            image_url: window.imageUrl || productImage,
            game_id: gameId,
            category_id: categoryId
        };
    
    
        fetch(`/edit-product/${productId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedProduct)
        })
        .then(response => response.json())
        .then(data => {
            if (data.message === 'Товар обновлен!') {
                alert('Товар успешно обновлен');
                fetchProducts();
                document.getElementById("edit-product-modal").classList.remove("show");
            } else {
                alert('Ошибка при обновлении товара');
            }
        })
        .catch(error => console.error('Ошибка при обновлении товара:', error));
    };

    deleteProductBtn.onclick = function () {
        const productId = document.getElementById("edit-product-id").value;
    
    
        fetch(`/delete-product/${productId}`, {
            method: 'DELETE',
        })
        .then(response => response.json())
        .then(data => {
            if (data.message === 'Товар удален') {
                alert('Товар успешно удален');
                fetchProducts();
                document.getElementById("edit-product-modal").classList.remove("show");
            } else {
                alert('Ошибка при удалении товара');
            }
        })
        .catch(error => console.error('Ошибка при удалении товара:', error));
    };
    
    fetchProducts();
    fetchGames();
    
    loadCategoriesForGame(gameSelect.value);

    function fetchProducts() {
        fetch('/get-products')
            .then(response => response.json())
            .then(products => {
                allProducts = products; // Сохраняем все товары для поиска
                displayProducts(products);
            })
            .catch(error => console.error('Ошибка при получении товаров:', error));
    }

    function fetchGames() {
        return fetch('/get-games')
            .then(response => response.json())
            .then(games => {
                allGames = games; // Сохраняем все игры для использования в других функциях
                return games;
            })
            .catch(error => {
                console.error('Ошибка при получении игр:', error);
                throw error;
            });
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
    const discountsSection = document.getElementById("discounts-section");
    const adminsSection = document.getElementById("admins-section");
    const sortingSection = document.getElementById("sorting-section");

    // Инициализируем promocodesSection после объявления других секций
    promocodesSection = document.getElementById("promocodes-section");

    // Восстанавливаем состояние после инициализации всех секций
    restoreSectionState();

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
        discountsSection.style.display = "none";
        if (promocodesSection) promocodesSection.style.display = "none";
        sortingSection.style.display = "none";
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
        discountsSection.style.display = "none";
        if (promocodesSection) promocodesSection.style.display = "none";
        sortingSection.style.display = "none";
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
        } else if (savedSection === 'discounts') {
            showDiscountsSection();
        } else if (savedSection === 'promocodes') {
            showPromocodesSection();
        } else {
            showProductsSection();
        }
    }

    // restoreSectionState() будет вызвана после инициализации всех секций

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
        
        // Восстанавливаем состояние раздела магазина (товары, категории или скидки)
        restoreSectionState();
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

    // Функция поиска категорий (только по названию)
    function searchCategories(searchTerm) {
        if (!searchTerm.trim()) {
            displayCategories(allCategories);
            return;
        }

        const filtered = allCategories.filter(category => {
            const name = category.name.toLowerCase();
            const search = searchTerm.toLowerCase();
            
            return name.includes(search);
        });

        displayCategories(filtered);
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
                allCategories = categories; // Сохраняем все категории для поиска
                displayCategories(categories);
            })
            .catch(error => {
                console.error('Ошибка при получении категорий:', error);
                categoryList.innerHTML = '<p>Ошибка при загрузке категорий</p>';
            });
    }

    // ========== ФУНКЦИОНАЛ СКИДОК ==========

    // Элементы для работы со скидками
    const addDiscountBtn = document.getElementById("add-discount-btn");
    const addDiscountModalBtn = document.getElementById("add-discount");
    const discountModal = document.getElementById("discount-modal");
    const closeDiscountModalBtn = document.querySelector(".close-btn-discount");
    const discountForm = document.getElementById("discount-form");
    const saveDiscountBtn = document.getElementById("save-discount-btn");
    const deleteDiscountBtn = document.getElementById("delete-discount-btn");
    const discountList = document.getElementById("discount-list");

    // Элементы для работы с промокодами
    const addPromocodeBtn = document.getElementById("add-promo-btn");
    const addPromocodeModalBtn = document.getElementById("add-promocode");
    const promocodeModal = document.getElementById("promocode-modal");
    const closePromocodeModalBtn = document.querySelector(".close-btn-promocode");
    const promocodeForm = document.getElementById("promocode-form");
    const savePromocodeBtn = document.getElementById("save-promocode-btn");
    const deletePromocodeBtn = document.getElementById("delete-promocode-btn");
    const promocodeList = document.getElementById("promocode-list");

    // Переключение на раздел скидок
    addDiscountBtn.addEventListener("click", function() {
        showDiscountsSection();
    });

    // Переключение на раздел промокодов
    addPromocodeBtn.addEventListener("click", function() {
        showPromocodesSection();
    });

    // Функция для показа раздела скидок
    function showDiscountsSection() {
        productsSection.style.display = "none";
        categoriesSection.style.display = "none";
        if (promocodesSection) promocodesSection.style.display = "none";
        sortingSection.style.display = "none";
        discountsSection.style.display = "block";
        fetchDiscounts();
        // Показываем боковое меню
        document.querySelector('.sidebar').style.display = "block";
        // Показываем родительский контейнер
        document.getElementById('content-area').style.display = "block";
        // Скрываем раздел администраторов
        adminsSection.style.display = "none";
        // Сохраняем состояние в localStorage
        localStorage.setItem('adminPanelSection', 'discounts');
    }

    // Функция для показа раздела промокодов
    function showPromocodesSection() {
        productsSection.style.display = "none";
        categoriesSection.style.display = "none";
        discountsSection.style.display = "none";
        sortingSection.style.display = "none";
        if (promocodesSection) promocodesSection.style.display = "block";
        adminsSection.style.display = "none";
        fetchPromocodes();
        // Показываем боковое меню
        document.querySelector('.sidebar').style.display = "block";
        // Показываем родительский контейнер
        document.getElementById('content-area').style.display = "block";
        localStorage.setItem('adminPanelSection', 'promocodes');
    }

    // Открытие модального окна для добавления скидки
    addDiscountModalBtn.addEventListener("click", function() {
        discountModal.classList.add("show");
        document.getElementById("discount-modal-title").textContent = "Добавить скидку";
        document.getElementById("discount-id").value = "";
        document.getElementById("discount-name").value = "";
        document.getElementById("discount-description").value = "";
        document.getElementById("discount-type").value = "percentage";
        document.getElementById("discount-value").value = "";
        document.getElementById("discount-start-date").value = "";
        document.getElementById("discount-end-date").value = "";
        document.getElementById("discount-target").value = "all";
        document.getElementById("discount-status").value = "active";
        deleteDiscountBtn.style.display = "none";
        saveDiscountBtn.textContent = "Создать скидку";
        
        // Скрываем дополнительные поля
        document.getElementById("game-target-group").style.display = "none";
        document.getElementById("category-target-group").style.display = "none";
        document.getElementById("product-target-group").style.display = "none";
        
        // Загружаем данные для селекторов
        loadGamesForDiscount();
        loadCategoriesForDiscount();
        loadProductsForDiscount();
    });

    // Закрытие модального окна скидки
    closeDiscountModalBtn.addEventListener("click", function() {
        discountModal.classList.remove("show");
    });

    // Предотвращение стандартной отправки формы
    discountForm.addEventListener("submit", function(event) {
        event.preventDefault();
        saveDiscount();
    });

    // Обработчик изменения типа цели скидки
    document.getElementById("discount-target").addEventListener("change", function() {
        const targetType = this.value;
        const gameGroup = document.getElementById("game-target-group");
        const categoryGroup = document.getElementById("category-target-group");
        const productGroup = document.getElementById("product-target-group");
        
        gameGroup.style.display = targetType === "game" ? "block" : "none";
        categoryGroup.style.display = targetType === "category" ? "block" : "none";
        productGroup.style.display = targetType === "product" ? "block" : "none";
    });

    // Обработчик поиска скидок
    document.getElementById("discount-search").addEventListener("input", function() {
        searchDiscounts(this.value);
    });

    // Обработчик поиска товаров
    document.getElementById("product-search").addEventListener("input", function() {
        searchProducts(this.value);
    });

    // Обработчик поиска категорий
    document.getElementById("category-search").addEventListener("input", function() {
        searchCategories(this.value);
    });

    // Обработчик поиска администраторов
    document.getElementById("admin-search").addEventListener("input", function() {
        searchAdmins(this.value);
    });

    // ========== ФУНКЦИОНАЛ ПРОМОКОДОВ ==========

    // Открытие модального окна для добавления промокода
    addPromocodeModalBtn.addEventListener("click", function() {
        promocodeModal.classList.add("show");
        document.getElementById("promocode-modal-title").textContent = "Добавить промокод";
        document.getElementById("promocode-id").value = "";
        document.getElementById("promocode-code").value = "";
        document.getElementById("promocode-description").value = "";
        document.getElementById("promocode-type").value = "percentage";
        document.getElementById("promocode-value").value = "";
        document.getElementById("promocode-start-date").value = "";
        document.getElementById("promocode-end-date").value = "";
        document.getElementById("promocode-target").value = "all";
        document.getElementById("promocode-usage-limit").value = "";
        document.getElementById("promocode-status").value = "active";
        deletePromocodeBtn.style.display = "none";
        savePromocodeBtn.textContent = "Создать промокод";
        
        // Скрываем дополнительные поля
        document.getElementById("promocode-game-group").style.display = "none";
        document.getElementById("promocode-category-group").style.display = "none";
        document.getElementById("promocode-product-group").style.display = "none";
        
        // Загружаем данные для селекторов
        loadGamesForPromocode();
        loadCategoriesForPromocode();
        loadProductsForPromocode();
    });

    // Закрытие модального окна промокода
    closePromocodeModalBtn.addEventListener("click", function() {
        promocodeModal.classList.remove("show");
    });

    // Предотвращение стандартной отправки формы промокода
    promocodeForm.addEventListener("submit", function(event) {
        event.preventDefault();
        savePromocode();
    });

    // Обработчик изменения типа цели промокода
    document.getElementById("promocode-target").addEventListener("change", function() {
        const targetType = this.value;
        const gameGroup = document.getElementById("promocode-game-group");
        const categoryGroup = document.getElementById("promocode-category-group");
        const productGroup = document.getElementById("promocode-product-group");
        
        gameGroup.style.display = targetType === "game" ? "block" : "none";
        categoryGroup.style.display = targetType === "category" ? "block" : "none";
        productGroup.style.display = targetType === "product" ? "block" : "none";
    });

    // Обработчик поиска промокодов
    document.getElementById("promocode-search").addEventListener("input", function() {
        searchPromocodes(this.value);
    });

    // Сохранение промокода
    function savePromocode() {
        const promocodeId = document.getElementById("promocode-id").value;
        const promocodeCode = document.getElementById("promocode-code").value;
        const promocodeDescription = document.getElementById("promocode-description").value;
        const promocodeType = document.getElementById("promocode-type").value;
        const promocodeValue = document.getElementById("promocode-value").value;
        const promocodeStartDate = document.getElementById("promocode-start-date").value;
        const promocodeEndDate = document.getElementById("promocode-end-date").value;
        const promocodeTarget = document.getElementById("promocode-target").value;
        const promocodeUsageLimit = document.getElementById("promocode-usage-limit").value;
        const promocodeStatus = document.getElementById("promocode-status").value;

        // Валидация
        if (!promocodeCode.trim()) {
            alert('Введите код промокода');
            return;
        }
        if (!promocodeValue || promocodeValue <= 0) {
            alert('Введите корректный размер скидки');
            return;
        }
        if (!promocodeStartDate || !promocodeEndDate) {
            alert('Выберите даты начала и окончания');
            return;
        }
        if (new Date(promocodeStartDate) >= new Date(promocodeEndDate)) {
            alert('Дата начала должна быть раньше даты окончания');
            return;
        }

        // Определяем target_id в зависимости от типа цели
        let targetId = null;
        if (promocodeTarget === 'game') {
            targetId = document.getElementById("promocode-game-select").value;
        } else if (promocodeTarget === 'category') {
            targetId = document.getElementById("promocode-category-select").value;
        } else if (promocodeTarget === 'product') {
            targetId = document.getElementById("promocode-product-select").value;
        }

        const promocodeData = {
            code: promocodeCode,
            description: promocodeDescription,
            type: promocodeType,
            value: parseFloat(promocodeValue),
            start_date: promocodeStartDate,
            end_date: promocodeEndDate,
            target_type: promocodeTarget,
            target_id: targetId,
            usage_limit: promocodeUsageLimit ? parseInt(promocodeUsageLimit) : null,
            status: promocodeStatus
        };

        const url = promocodeId ? `/edit-promocode/${promocodeId}` : '/add-promocode';
        const method = promocodeId ? 'PUT' : 'POST';

        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(promocodeData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                promocodeModal.classList.remove("show");
                fetchPromocodes();
                alert(promocodeId ? 'Промокод обновлен' : 'Промокод создан');
            } else {
                alert('Ошибка: ' + (data.error || 'Неизвестная ошибка'));
            }
        })
        .catch(error => {
            console.error('Ошибка при сохранении промокода:', error);
            alert('Ошибка при сохранении промокода');
        });
    }

    // Удаление промокода
    deletePromocodeBtn.addEventListener("click", function() {
        const promocodeId = document.getElementById("promocode-id").value;
        
        if (!promocodeId) {
            alert('Промокод не выбран');
            return;
        }

        if (confirm('Вы уверены, что хотите удалить этот промокод?')) {
            fetch(`/delete-promocode/${promocodeId}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    promocodeModal.classList.remove("show");
                    fetchPromocodes();
                    alert('Промокод удален');
                } else {
                    alert('Ошибка: ' + (data.error || 'Неизвестная ошибка'));
                }
            })
            .catch(error => {
                console.error('Ошибка при удалении промокода:', error);
                alert('Ошибка при удалении промокода');
            });
        }
    });

    // Сохранение скидки
    function saveDiscount() {
        const discountId = document.getElementById("discount-id").value;
        const discountName = document.getElementById("discount-name").value;
        const discountDescription = document.getElementById("discount-description").value;
        const discountType = document.getElementById("discount-type").value;
        const discountValue = document.getElementById("discount-value").value;
        const discountStartDate = document.getElementById("discount-start-date").value;
        const discountEndDate = document.getElementById("discount-end-date").value;
        const discountTarget = document.getElementById("discount-target").value;
        const discountStatus = document.getElementById("discount-status").value;

        if (!discountName.trim()) {
            alert("Введите название скидки");
            return;
        }

        if (!discountValue || discountValue <= 0) {
            alert("Введите корректный размер скидки");
            return;
        }

        if (!discountStartDate || !discountEndDate) {
            alert("Выберите даты начала и окончания скидки");
            return;
        }

        if (new Date(discountStartDate) >= new Date(discountEndDate)) {
            alert("Дата окончания должна быть позже даты начала");
            return;
        }

        const discountData = {
            name: discountName,
            description: discountDescription,
            type: discountType,
            value: parseFloat(discountValue),
            start_date: discountStartDate,
            end_date: discountEndDate,
            target_type: discountTarget,
            target_id: discountTarget === "game" ? document.getElementById("discount-game-select").value :
                      discountTarget === "category" ? document.getElementById("discount-category-select").value : 
                      discountTarget === "product" ? document.getElementById("discount-product-select").value : null,
            status: discountStatus
        };

        if (discountId) {
            // Редактирование существующей скидки
            fetch(`/edit-discount/${discountId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(discountData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.message) {
                    alert(data.message);
                    fetchDiscounts();
                    discountModal.classList.remove("show");
                } else {
                    alert(data.error || 'Ошибка при обновлении скидки');
                }
            })
            .catch(error => {
                console.error('Ошибка при обновлении скидки:', error);
                alert('Ошибка при обновлении скидки');
            });
        } else {
            // Добавление новой скидки
            fetch('/add-discount', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(discountData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.message) {
                    alert(data.message);
                    fetchDiscounts();
                    discountModal.classList.remove("show");
                } else {
                    alert(data.error || 'Ошибка при добавлении скидки');
                }
            })
            .catch(error => {
                console.error('Ошибка при добавлении скидки:', error);
                alert('Ошибка при добавлении скидки');
            });
        }
    }

    // Обработчик для кнопки сохранения (для совместимости)
    saveDiscountBtn.addEventListener("click", function(event) {
        event.preventDefault();
        saveDiscount();
    });

    // Удаление скидки
    deleteDiscountBtn.addEventListener("click", function() {
        const discountId = document.getElementById("discount-id").value;
        
        if (!discountId) return;

        if (confirm("Вы уверены, что хотите удалить эту скидку?")) {
            fetch(`/delete-discount/${discountId}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.message) {
                    alert(data.message);
                    fetchDiscounts();
                    discountModal.classList.remove("show");
                } else {
                    alert(data.error || 'Ошибка при удалении скидки');
                }
            })
            .catch(error => {
                console.error('Ошибка при удалении скидки:', error);
                alert('Ошибка при удалении скидки');
            });
        }
    });

    // Функция для отображения скидок
    function displayDiscounts(discounts) {
        discountList.innerHTML = '';
        
        if (discounts.length === 0) {
            discountList.innerHTML = '<p>Скидки не найдены. Добавьте первую скидку!</p>';
            return;
        }

        discounts.forEach(discount => {
            const discountItem = document.createElement('div');
            discountItem.classList.add('discount-item');
            
            const discountValue = discount.type === 'percentage' ? 
                `${discount.value}%` : 
                `${discount.value} ₽`;
            
            const targetText = discount.target_type === 'all' ? 'Все товары' :
                             discount.target_type === 'game' ? `Игра: ${discount.game_name || 'Не указана'}` :
                             discount.target_type === 'category' ? `Категория: ${discount.category_name || 'Не указана'}` :
                             discount.target_type === 'product' ? `Товар: ${discount.product_name || 'Не указан'}` :
                             'Не указано';
            
            const statusText = discount.status === 'active' ? 'Активна' : 'Неактивна';
            const statusClass = discount.status === 'active' ? 'status-active' : 'status-inactive';
            
            discountItem.innerHTML = `
                <div class="discount-info">
                    <h4>${discount.name}</h4>
                    <p><strong>Размер:</strong> ${discountValue}</p>
                    <p><strong>Применяется к:</strong> ${targetText}</p>
                    <p><strong>Период:</strong> ${new Date(discount.start_date).toLocaleDateString()} - ${new Date(discount.end_date).toLocaleDateString()}</p>
                    <p><strong>Статус:</strong> <span class="${statusClass}">${statusText}</span></p>
                    <p><strong>Описание:</strong> ${discount.description || 'Нет описания'}</p>
                </div>
                <div class="discount-actions">
                    <button class="edit-discount-btn" data-id="${discount.id}">Редактировать</button>
                </div>
            `;
            
            // Обработчик для редактирования
            const editBtn = discountItem.querySelector('.edit-discount-btn');
            editBtn.addEventListener('click', () => {
                openEditDiscountModal(discount);
            });
            
            discountList.appendChild(discountItem);
        });
    }

    // Функция для открытия модального окна редактирования скидки
    function openEditDiscountModal(discount) {
        document.getElementById("discount-modal-title").textContent = "Редактировать скидку";
        document.getElementById("discount-id").value = discount.id;
        document.getElementById("discount-name").value = discount.name;
        document.getElementById("discount-description").value = discount.description || '';
        document.getElementById("discount-type").value = discount.type;
        document.getElementById("discount-value").value = discount.value;
        
        // Конвертируем даты в формат для datetime-local
        const startDate = new Date(discount.start_date);
        const endDate = new Date(discount.end_date);
        const startDateFormatted = startDate.toISOString().slice(0, 16);
        const endDateFormatted = endDate.toISOString().slice(0, 16);
        
        document.getElementById("discount-start-date").value = startDateFormatted;
        document.getElementById("discount-end-date").value = endDateFormatted;
        document.getElementById("discount-target").value = discount.target_type;
        document.getElementById("discount-status").value = discount.status;
        deleteDiscountBtn.style.display = "block";
        saveDiscountBtn.textContent = "Сохранить изменения";
        
        // Показываем/скрываем дополнительные поля
        const targetType = discount.target_type;
        const gameGroup = document.getElementById("game-target-group");
        const categoryGroup = document.getElementById("category-target-group");
        const productGroup = document.getElementById("product-target-group");
        
        gameGroup.style.display = targetType === "game" ? "block" : "none";
        categoryGroup.style.display = targetType === "category" ? "block" : "none";
        productGroup.style.display = targetType === "product" ? "block" : "none";
        
        // Загружаем данные и устанавливаем значения
        loadGamesForDiscount().then(() => {
            if (targetType === "game" && discount.target_id) {
                document.getElementById("discount-game-select").value = discount.target_id;
            }
        });
        
        loadCategoriesForDiscount().then(() => {
            if (targetType === "category" && discount.target_id) {
                document.getElementById("discount-category-select").value = discount.target_id;
            }
        });
        
        loadProductsForDiscount().then(() => {
            if (targetType === "product" && discount.target_id) {
                document.getElementById("discount-product-select").value = discount.target_id;
            }
        });
        
        discountModal.classList.add("show");
    }

    // Функция для получения скидок с сервера
    function fetchDiscounts() {
        fetch('/get-discounts')
            .then(response => response.json())
            .then(discounts => {
                allDiscounts = discounts; // Сохраняем все скидки для поиска
                displayDiscounts(discounts);
            })
            .catch(error => {
                console.error('Ошибка при получении скидок:', error);
                discountList.innerHTML = '<p>Ошибка при загрузке скидок</p>';
            });
    }

    // Функция поиска скидок (только по названию)
    function searchDiscounts(searchTerm) {
        if (!searchTerm.trim()) {
            displayDiscounts(allDiscounts);
            return;
        }

        const filtered = allDiscounts.filter(discount => {
            const name = discount.name.toLowerCase();
            const search = searchTerm.toLowerCase();
            
            return name.includes(search);
        });

        displayDiscounts(filtered);
    }

    // Функция для загрузки игр для скидок
    function loadGamesForDiscount() {
        return fetch('/get-games')
            .then(response => response.json())
            .then(games => {
                const gameSelect = document.getElementById("discount-game-select");
                gameSelect.innerHTML = '<option value="">Выберите игру</option>';
                
                games.forEach(game => {
                    const option = document.createElement('option');
                    option.value = game.id;
                    option.textContent = game.name;
                    gameSelect.appendChild(option);
                });
            })
            .catch(error => {
                console.error('Ошибка при получении игр для скидок:', error);
            });
    }

    // Функция для загрузки категорий для скидок
    function loadCategoriesForDiscount() {
        return fetch('/get-categories')
            .then(response => response.json())
            .then(categories => {
                const categorySelect = document.getElementById("discount-category-select");
                categorySelect.innerHTML = '<option value="">Выберите категорию</option>';
                
                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    categorySelect.appendChild(option);
                });
            })
            .catch(error => {
                console.error('Ошибка при получении категорий для скидок:', error);
            });
    }

    // Функция для загрузки товаров для скидок
    function loadProductsForDiscount() {
        return fetch('/get-products')
            .then(response => response.json())
            .then(products => {
                const productSelect = document.getElementById("discount-product-select");
                productSelect.innerHTML = '<option value="">Выберите товар</option>';
                
                products.forEach(product => {
                    const option = document.createElement('option');
                    option.value = product.id;
                    option.textContent = product.name;
                    productSelect.appendChild(option);
                });
            })
            .catch(error => {
                console.error('Ошибка при получении товаров для скидок:', error);
            });
    }

    // Функция для получения промокодов с сервера
    function fetchPromocodes() {
        fetch('/get-promocodes')
            .then(response => response.json())
            .then(promocodes => {
                allPromocodes = promocodes; // Сохраняем все промокоды для поиска
                displayPromocodes(promocodes);
            })
            .catch(error => {
                console.error('Ошибка при получении промокодов:', error);
                promocodeList.innerHTML = '<p>Ошибка при загрузке промокодов</p>';
            });
    }

    // Функция поиска промокодов (только по коду)
    function searchPromocodes(searchTerm) {
        if (!searchTerm.trim()) {
            displayPromocodes(allPromocodes);
            return;
        }

        const filtered = allPromocodes.filter(promocode => {
            const code = promocode.code.toLowerCase();
            const search = searchTerm.toLowerCase();
            
            return code.includes(search);
        });

        displayPromocodes(filtered);
    }

    // Функция для отображения промокодов
    function displayPromocodes(promocodes) {
        promocodeList.innerHTML = '';
        
        if (promocodes.length === 0) {
            promocodeList.innerHTML = '<p>Промокоды не найдены. Добавьте первый промокод!</p>';
            return;
        }

        promocodes.forEach(promocode => {
            const promocodeItem = document.createElement('div');
            promocodeItem.classList.add('promocode-item');
            promocodeItem.innerHTML = `
                <div class="promocode-info">
                    <h4>${promocode.code}</h4>
                    <p><strong>Размер:</strong> ${promocode.value}${promocode.type === 'percentage' ? '%' : ' ₽'}</p>
                    <p><strong>Применяется к:</strong> ${getPromocodeTargetText(promocode)}</p>
                    <p><strong>Период:</strong> ${formatDate(promocode.start_date)} - ${formatDate(promocode.end_date)}</p>
                    <p><strong>Статус:</strong> <span class="status-${promocode.status}">${promocode.status === 'active' ? 'Активен' : 'Неактивен'}</span></p>
                    <p><strong>Описание:</strong> ${promocode.description || 'Нет описания'}</p>
                    <p><strong>Лимит использований:</strong> ${promocode.usage_limit || 'Без ограничений'}</p>
                </div>
                <div class="promocode-actions">
                    <button class="edit-promocode-btn" data-id="${promocode.id}">Редактировать</button>
                </div>
            `;
            
            // Обработчик для редактирования
            const editBtn = promocodeItem.querySelector('.edit-promocode-btn');
            editBtn.addEventListener('click', () => {
                openEditPromocodeModal(promocode);
            });
            
            promocodeList.appendChild(promocodeItem);
        });
    }

    // Функция для получения текста цели промокода
    function getPromocodeTargetText(promocode) {
        switch(promocode.target_type) {
            case 'all':
                return 'Все товары';
            case 'game':
                return `Игра: ${promocode.game_name || 'Не указана'}`;
            case 'category':
                return `Категория: ${promocode.category_name || 'Не указана'}`;
            case 'product':
                return `Товар: ${promocode.product_name || 'Не указан'}`;
            default:
                return 'Не указано';
        }
    }

    // Функция для форматирования даты
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU');
    }

    // Функция для открытия модального окна редактирования промокода
    function openEditPromocodeModal(promocode) {
        document.getElementById("promocode-modal-title").textContent = "Редактировать промокод";
        document.getElementById("promocode-id").value = promocode.id;
        document.getElementById("promocode-code").value = promocode.code;
        document.getElementById("promocode-description").value = promocode.description || '';
        document.getElementById("promocode-type").value = promocode.type;
        document.getElementById("promocode-value").value = promocode.value;
        document.getElementById("promocode-target").value = promocode.target_type;
        document.getElementById("promocode-usage-limit").value = promocode.usage_limit || '';
        document.getElementById("promocode-status").value = promocode.status;
        
        // Форматируем даты для datetime-local
        const startDate = new Date(promocode.start_date);
        const endDate = new Date(promocode.end_date);
        const startDateFormatted = startDate.toISOString().slice(0, 16);
        const endDateFormatted = endDate.toISOString().slice(0, 16);
        
        document.getElementById("promocode-start-date").value = startDateFormatted;
        document.getElementById("promocode-end-date").value = endDateFormatted;
        
        // Показываем/скрываем дополнительные поля
        const targetType = promocode.target_type;
        document.getElementById("promocode-game-group").style.display = targetType === "game" ? "block" : "none";
        document.getElementById("promocode-category-group").style.display = targetType === "category" ? "block" : "none";
        document.getElementById("promocode-product-group").style.display = targetType === "product" ? "block" : "none";
        
        // Загружаем данные для селекторов
        loadGamesForPromocode().then(() => {
            if (targetType === "game") {
                document.getElementById("promocode-game-select").value = promocode.target_id;
            }
        });
        
        loadCategoriesForPromocode().then(() => {
            if (targetType === "category") {
                document.getElementById("promocode-category-select").value = promocode.target_id;
            }
        });
        
        loadProductsForPromocode().then(() => {
            if (targetType === "product") {
                document.getElementById("promocode-product-select").value = promocode.target_id;
            }
        });
        
        deletePromocodeBtn.style.display = "block";
        savePromocodeBtn.textContent = "Сохранить изменения";
        
        promocodeModal.classList.add("show");
    }

    // Функция для загрузки игр для промокодов
    function loadGamesForPromocode() {
        return fetch('/get-games')
            .then(response => response.json())
            .then(games => {
                const gameSelect = document.getElementById("promocode-game-select");
                gameSelect.innerHTML = '<option value="">Выберите игру</option>';
                
                games.forEach(game => {
                    const option = document.createElement('option');
                    option.value = game.id;
                    option.textContent = game.name;
                    gameSelect.appendChild(option);
                });
            })
            .catch(error => {
                console.error('Ошибка при получении игр для промокодов:', error);
            });
    }

    // Функция для загрузки категорий для промокодов
    function loadCategoriesForPromocode() {
        return fetch('/get-categories')
            .then(response => response.json())
            .then(categories => {
                const categorySelect = document.getElementById("promocode-category-select");
                categorySelect.innerHTML = '<option value="">Выберите категорию</option>';
                
                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    categorySelect.appendChild(option);
                });
            })
            .catch(error => {
                console.error('Ошибка при получении категорий для промокодов:', error);
            });
    }

    // Функция для загрузки товаров для промокодов
    function loadProductsForPromocode() {
        return fetch('/get-products')
            .then(response => response.json())
            .then(products => {
                const productSelect = document.getElementById("promocode-product-select");
                productSelect.innerHTML = '<option value="">Выберите товар</option>';
                
                products.forEach(product => {
                    const option = document.createElement('option');
                    option.value = product.id;
                    option.textContent = product.name;
                    productSelect.appendChild(option);
                });
            })
            .catch(error => {
                console.error('Ошибка при получении товаров для промокодов:', error);
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
        document.getElementById("admin-user-search").value = "";
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

    // Функция поиска администраторов (только по имени пользователя)
    function searchAdmins(searchTerm) {
        if (!searchTerm.trim()) {
            displayAdmins(allAdmins);
            return;
        }

        const filtered = allAdmins.filter(admin => {
            const username = admin.username.toLowerCase();
            const search = searchTerm.toLowerCase();
            
            return username.includes(search);
        });

        displayAdmins(filtered);
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
            const user = allUsers.find(u => u.id == admin.user_id);
            if (user) {
                document.getElementById("admin-user-search").value = user.username;
                document.getElementById("admin-user-select").value = admin.user_id;
            }
        });
        
        adminModal.classList.add("show");
    }

    // Функция для получения администраторов с сервера
    function fetchAdmins() {
        fetch('/get-admins')
            .then(response => response.json())
            .then(admins => {
                allAdmins = admins; // Сохраняем всех администраторов для поиска
                displayAdmins(admins);
            })
            .catch(error => {
                console.error('Ошибка при получении администраторов:', error);
                adminList.innerHTML = '<p>Ошибка при загрузке администраторов</p>';
            });
    }

    // Функция для получения пользователей с сервера
    let allUsers = []; // Глобальная переменная для хранения всех пользователей

    function fetchUsers() {
        return fetch('/get-users')
            .then(response => response.json())
            .then(users => {
                allUsers = users; // Сохраняем всех пользователей
                setupUserSearch(); // Настраиваем поиск
            })
            .catch(error => {
                console.error('Ошибка при получении пользователей:', error);
            });
    }

    function setupUserSearch() {
        const searchInput = document.getElementById('admin-user-search');
        const searchResults = document.getElementById('user-search-results');
        const hiddenInput = document.getElementById('admin-user-select');

        // Обработчик ввода в поле поиска
        searchInput.addEventListener('input', function() {
            const query = this.value.trim();
            
            if (query.length < 2) {
                searchResults.style.display = 'none';
                return;
            }

            // Поиск по имени пользователя и SteamID
            const filteredUsers = allUsers.filter(user => {
                const username = user.username.toLowerCase();
                const steamId = user.steam_id ? user.steam_id.toLowerCase() : '';
                const searchQuery = query.toLowerCase();
                
                return username.includes(searchQuery) || steamId.includes(searchQuery);
            });

            displaySearchResults(filteredUsers);
        });

        // Обработчик клика вне поля поиска
        document.addEventListener('click', function(e) {
            if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                searchResults.style.display = 'none';
            }
        });

        // Обработчик клавиш для навигации
        searchInput.addEventListener('keydown', function(e) {
            const items = searchResults.querySelectorAll('.search-result-item');
            const selected = searchResults.querySelector('.search-result-item.selected');
            let selectedIndex = -1;

            if (selected) {
                selectedIndex = Array.from(items).indexOf(selected);
            }

            switch(e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    if (selectedIndex < items.length - 1) {
                        if (selected) selected.classList.remove('selected');
                        items[selectedIndex + 1].classList.add('selected');
                    }
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    if (selectedIndex > 0) {
                        if (selected) selected.classList.remove('selected');
                        items[selectedIndex - 1].classList.add('selected');
                    }
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (selected) {
                        selected.click();
                    }
                    break;
                case 'Escape':
                    searchResults.style.display = 'none';
                    break;
            }
        });
    }

    function displaySearchResults(users) {
        const searchResults = document.getElementById('user-search-results');
        
        if (users.length === 0) {
            searchResults.innerHTML = '<div class="search-result-item">Пользователи не найдены</div>';
        } else {
            searchResults.innerHTML = '';
            
            users.forEach(user => {
                const item = document.createElement('div');
                item.className = 'search-result-item';
                item.innerHTML = `
                    <div class="search-result-username">${user.username}</div>
                    <div class="search-result-steamid">SteamID: ${user.steam_id || 'Не указан'}</div>
                `;
                
                item.addEventListener('click', function() {
                    selectUser(user);
                });
                
                searchResults.appendChild(item);
            });
        }
        
        searchResults.style.display = 'block';
    }

    function selectUser(user) {
        const searchInput = document.getElementById('admin-user-search');
        const searchResults = document.getElementById('user-search-results');
        const hiddenInput = document.getElementById('admin-user-select');
        
        // Устанавливаем выбранного пользователя
        searchInput.value = user.username;
        hiddenInput.value = user.id;
        
        // Скрываем результаты поиска
        searchResults.style.display = 'none';
    }

    // ========== ФУНКЦИОНАЛ СМЕНЫ ПАРОЛЯ ==========
    
    // Функция для проверки временного пароля
    function checkTempPassword(username) {
        fetch(`/check-temp-password/${username}`)
            .then(response => response.json())
            .then(data => {
                if (data.isTempPassword === true || data.isTempPassword === 1) {
                    showChangePasswordModal(username);
                }
            })
            .catch(error => {
                console.error("Ошибка при проверке временного пароля:", error);
            });
    }
    
    // Функция для показа модального окна смены пароля
    function showChangePasswordModal(username) {
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

    // ========== ФУНКЦИОНАЛ СОРТИРОВКИ ТОВАРОВ ==========

    // Элементы для работы с сортировкой
    const addSortingBtn = document.getElementById("add-sorting-btn");
    const sortingGameSelect = document.getElementById("sorting-game-select");
    const loadProductsBtn = document.getElementById("load-products-for-sorting");
    const sortingProductsArea = document.getElementById("sorting-products-area");
    const sortableProductsList = document.getElementById("sortable-products-list");
    const saveSortingBtn = document.getElementById("save-sorting-btn");
    const resetSortingBtn = document.getElementById("reset-sorting-btn");


    let currentSortingProducts = [];
    let originalProductOrder = [];

    // Переключение на раздел сортировки
    addSortingBtn.addEventListener("click", function() {
        showSortingSection();
    });

    // Заполнение списка игр для сортировки
    function populateSortingGames() {
        if (!sortingGameSelect) {
            console.error('sortingGameSelect element not found!');
            return;
        }
        
        sortingGameSelect.innerHTML = '<option value="">Выберите игру</option>';
        allGames.forEach(game => {
            const option = document.createElement('option');
            option.value = game.id;
            option.textContent = game.name;
            sortingGameSelect.appendChild(option);
        });
    }

    // Функция для скрытия всех секций
    function hideAllSections() {
        productsSection.style.display = "none";
        categoriesSection.style.display = "none";
        discountsSection.style.display = "none";
        if (promocodesSection) promocodesSection.style.display = "none";
        adminsSection.style.display = "none";
        sortingSection.style.display = "none";
    }

    // Показ секции сортировки
    function showSortingSection() {
        hideAllSections();
        sortingSection.style.display = 'block';
        
        // Всегда загружаем игры заново для актуальности
        fetchGames().then(() => {
            populateSortingGames();
        }).catch(error => {
            console.error('Error fetching games:', error);
        });
    }

    // Обработчик изменения игры
    sortingGameSelect.addEventListener('change', function() {
        if (this.value) {
            loadProductsBtn.style.display = 'block';
        } else {
            loadProductsBtn.style.display = 'none';
            sortingProductsArea.style.display = 'none';
        }
    });

    // Загрузка товаров для сортировки
    loadProductsBtn.addEventListener('click', function() {
        const gameId = sortingGameSelect.value;
        if (!gameId) return;

        // Фильтруем товары по выбранной игре
        currentSortingProducts = allProducts.filter(product => product.game_id == gameId);
        originalProductOrder = [...currentSortingProducts];

        // Сортируем по текущему порядку (если есть поле sort_order)
        currentSortingProducts.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

        displaySortableProducts();
        sortingProductsArea.style.display = 'block';
    });

    // Отображение сортируемых товаров
    function displaySortableProducts() {
        sortableProductsList.innerHTML = '';
        
        currentSortingProducts.forEach((product, index) => {
            const game = allGames.find(g => g.id === product.game_id);
            const category = allCategories.find(c => c.id === product.category_id);
            
            const productItem = document.createElement('div');
            productItem.className = 'sortable-item';
            productItem.draggable = true;
            productItem.dataset.productId = product.id;
            
            productItem.innerHTML = `
                <div class="sortable-item-order">${index + 1}</div>
                <img src="${product.image_url || '/img/placeholder.png'}" alt="${product.name}" class="sortable-item-image">
                <div class="sortable-item-info">
                    <h4 class="sortable-item-name">${product.name}</h4>
                    <div class="sortable-item-meta">
                        ${game ? `<span class="sortable-item-game">${game.name}</span>` : ''}
                        ${category ? `<span class="sortable-item-category">${category.name}</span>` : ''}
                    </div>
                    <div class="sortable-item-price">${product.price} ₽</div>
                </div>
                <div class="sortable-item-drag-handle">⋮⋮</div>
            `;
            
            // Добавляем обработчики перетаскивания
            productItem.addEventListener('dragstart', handleDragStart);
            productItem.addEventListener('dragover', handleDragOver);
            productItem.addEventListener('drop', handleDrop);
            productItem.addEventListener('dragend', handleDragEnd);
            
            sortableProductsList.appendChild(productItem);
        });
    }

    // Обработчики перетаскивания
    let draggedElement = null;

    function handleDragStart(e) {
        draggedElement = this;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.outerHTML);
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const afterElement = getDragAfterElement(sortableProductsList, e.clientY);
        if (afterElement == null) {
            sortableProductsList.appendChild(draggedElement);
        } else {
            sortableProductsList.insertBefore(draggedElement, afterElement);
        }
    }

    function handleDrop(e) {
        e.preventDefault();
        return false;
    }

    function handleDragEnd(e) {
        this.classList.remove('dragging');
        draggedElement = null;
        updateProductOrder();
    }

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.sortable-item:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // Обновление порядка товаров
    function updateProductOrder() {
        const items = sortableProductsList.querySelectorAll('.sortable-item');
        items.forEach((item, index) => {
            const orderElement = item.querySelector('.sortable-item-order');
            orderElement.textContent = index + 1;
        });
    }

    // Сохранение нового порядка
    saveSortingBtn.addEventListener('click', function() {
        const items = sortableProductsList.querySelectorAll('.sortable-item');
        const newOrder = Array.from(items).map((item, index) => ({
            id: parseInt(item.dataset.productId),
            sort_order: index + 1
        }));

        // Отправляем новый порядок на сервер
        fetch('/update-product-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ products: newOrder })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Порядок товаров сохранен!');
                // Обновляем локальные данные
                newOrder.forEach(item => {
                    const product = allProducts.find(p => p.id === item.id);
                    if (product) {
                        product.sort_order = item.sort_order;
                    }
                });
            } else {
                alert('Ошибка при сохранении порядка');
            }
        })
        .catch(error => {
            console.error('Ошибка:', error);
            alert('Ошибка при сохранении порядка');
        });
    });

    // Сброс порядка
    resetSortingBtn.addEventListener('click', function() {
        if (confirm('Вы уверены, что хотите сбросить порядок товаров?')) {
            currentSortingProducts = [...originalProductOrder];
            displaySortableProducts();
        }
    });
});
