// Глобальные переменные
let allProducts = [];
let allCategories = [];
let allGames = [];
let filteredProducts = [];
let cart = [];

// DOM элементы
const searchInput = document.getElementById('search-input');
const gameFilter = document.getElementById('game-filter');
const sortFilter = document.getElementById('sort-filter');
const productsGrid = document.getElementById('products-grid');
const productsTitle = document.getElementById('products-title');
const productsCount = document.getElementById('products-count');
const loadingIndicator = document.getElementById('loading-indicator');
const noProducts = document.getElementById('no-products');
const categoriesSidebar = document.getElementById('categories-sidebar');

// Модальные окна
const productModal = document.getElementById('product-modal');
const cartModal = document.getElementById('cart-modal');
const cartButton = document.getElementById('cart-button');
const cartCount = document.getElementById('cart-count');

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    initializeStore();
    setupEventListeners();
    loadCartFromStorage();
    updateCartUI();
});

// Проверка авторизации
function checkAuth() {
    fetch("/profile")
        .then(response => {
            if (!response.ok) {
                // Пользователь не авторизован
                showAuthButton();
                return;
            }
            return response.json();
        })
        .then(user => {
            if (user) {
                // Пользователь авторизован
                showUserProfile(user);
            } else {
                showAuthButton();
            }
        })
        .catch(error => {
            console.error("Ошибка при проверке авторизации:", error);
            showAuthButton();
        });
}

// Показать кнопку авторизации
function showAuthButton() {
    const authBtn = document.getElementById('auth-btn');
    const profileInfo = document.querySelector('.profile-info');
    
    if (authBtn) authBtn.style.display = 'block';
    if (profileInfo) profileInfo.style.display = 'none';
}

// Показать профиль пользователя
function showUserProfile(user) {
    const authBtn = document.getElementById('auth-btn');
    const profileInfo = document.querySelector('.profile-info');
    const balanceAmount = document.querySelector('.balance-amount');
    const profileAvatar = document.querySelector('.profile-avatar');
    
    if (authBtn) authBtn.style.display = 'none';
    if (profileInfo) profileInfo.style.display = 'flex';
    
    // Обновляем баланс пользователя
    if (balanceAmount) {
        balanceAmount.textContent = user.balance || '0';
    }
    
    // Загружаем аватар (только из кэша)
    if (profileAvatar) {
        loadUserAvatar(user, profileAvatar);
    }
}

// Функции для работы с cookies
function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
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

// Загрузка аватара пользователя
function loadUserAvatar(user, avatarElement, checkForUpdates = false) {
    const steamId = user.steam_id || user.steamid;
    
    if (!steamId) {
        // Если нет Steam ID, используем заглушку
        avatarElement.src = "/img/default-avatar.png";
        avatarElement.alt = user.username;
        return;
    }
    
    // Проверяем кэш в cookies
    const avatarCookie = getCookie(`avatar-${steamId}`);
    
    if (avatarCookie && !checkForUpdates) {
        // Если аватарка есть в куках и не нужно проверять обновления, сразу отображаем
        avatarElement.src = avatarCookie;
        avatarElement.alt = user.username;
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
                    avatarElement.alt = user.username;
                    setCookie(`avatar-${steamId}`, data.avatarUrl, 7); // Сохраняем на 7 дней
                    console.log("Аватарка обновлена с сервера");
                } else {
                    avatarElement.src = "/img/default-avatar.png";
                    avatarElement.alt = user.username;
                }
            })
            .catch(error => {
                console.error("Ошибка загрузки аватара:", error);
                avatarElement.src = "/img/default-avatar.png";
                avatarElement.alt = user.username;
            });
    }
}

// Инициализация магазина
async function initializeStore() {
    showLoading(true);
    
    try {
        // Загружаем данные параллельно
        await Promise.all([
            loadProducts(),
            loadCategories(),
            loadGames()
        ]);
        
        // Инициализируем фильтры
        populateFilters();
        populateSidebar();
        
        // Показываем все товары
        displayProducts(allProducts);
        updateProductsTitle();
        
    } catch (error) {
        console.error('Ошибка при инициализации магазина:', error);
        showError('Ошибка при загрузке данных');
    } finally {
        showLoading(false);
    }
}

// Загрузка товаров
async function loadProducts(gameId = null) {
    try {
        // Всегда загружаем ВСЕ товары для корректной работы фильтров
        const response = await fetch('/get-items');
        if (!response.ok) {
            throw new Error('Ошибка при загрузке товаров');
        }
        allProducts = await response.json();
        filteredProducts = [...allProducts];
    } catch (error) {
        console.error('Ошибка при загрузке товаров:', error);
        throw error;
    }
}

// Загрузка категорий
async function loadCategories() {
    try {
        const response = await fetch('/get-categories');
        if (!response.ok) {
            throw new Error('Ошибка при загрузке категорий');
        }
        allCategories = await response.json();
    } catch (error) {
        console.error('Ошибка при загрузке категорий:', error);
        throw error;
    }
}

// Загрузка игр
async function loadGames() {
    try {
        const response = await fetch('/get-games');
        if (!response.ok) {
            throw new Error('Ошибка при загрузке игр');
        }
        allGames = await response.json();
    } catch (error) {
        console.error('Ошибка при загрузке игр:', error);
        throw error;
    }
}

// Заполнение фильтров
function populateFilters() {
    // Заполняем фильтр игр
    gameFilter.innerHTML = '<option value="">Все игры</option>';
    allGames.forEach(game => {
        const option = document.createElement('option');
        option.value = game.id;
        option.textContent = game.name;
        gameFilter.appendChild(option);
    });
}

// Заполнение боковой панели категорий
function populateSidebar(gameId = null) {
    categoriesSidebar.innerHTML = '';
    
    // Добавляем "Все категории"
    const allCategoriesItem = document.createElement('div');
    allCategoriesItem.className = 'category-item active';
    allCategoriesItem.textContent = 'Все категории';
    allCategoriesItem.addEventListener('click', () => {
        selectCategory(null);
    });
    categoriesSidebar.appendChild(allCategoriesItem);
    
    // Показываем категории только если выбрана конкретная игра
    if (gameId) {
        const categoriesToShow = allCategories.filter(category => category.game_id == gameId);
        
        // Добавляем категории
        categoriesToShow.forEach(category => {
            const categoryItem = document.createElement('div');
            categoryItem.className = 'category-item';
            categoryItem.textContent = category.name;
            categoryItem.addEventListener('click', () => {
                selectCategory(category.id);
            });
            categoriesSidebar.appendChild(categoryItem);
        });
    }
}

// Выбор категории в боковой панели
function selectCategory(categoryId) {
    // Обновляем активную категорию
    document.querySelectorAll('.category-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Применяем фильтры с выбранной категорией
    applyFilters(categoryId);
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Поиск
    searchInput.addEventListener('input', debounce(() => applyFilters(), 300));
    
    // Фильтры
    gameFilter.addEventListener('change', function() {
        const selectedGameId = this.value;
        
        // Обновляем категории в боковой панели
        populateSidebar(selectedGameId || null);
        
        // Сбрасываем активную категорию
        document.querySelectorAll('.category-item').forEach(item => {
            item.classList.remove('active');
        });
        if (document.querySelector('.category-item')) {
            document.querySelector('.category-item').classList.add('active');
        }
        
        // Применяем фильтры (товары уже загружены)
        applyFilters();
    });
    sortFilter.addEventListener('change', () => applyFilters());
    
    // Модальные окна
    setupModalEventListeners();
    
    // Корзина
    setupCartEventListeners();
}

// Настройка обработчиков модальных окон
function setupModalEventListeners() {
    // Закрытие модальных окон
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', closeModals);
    });
    
    // Закрытие по клику вне модального окна
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            closeModals();
        }
    });
    
    // Закрытие по Escape
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeModals();
        }
    });
}

// Настройка обработчиков корзины
function setupCartEventListeners() {
    // Кнопка корзины
    cartButton.addEventListener('click', () => {
        cartModal.classList.add('show');
    });
    
    // Кнопки в модальном окне товара
    document.getElementById('buy-product-btn').addEventListener('click', buyProduct);
    document.getElementById('add-to-cart-btn').addEventListener('click', addToCart);
    
    // Кнопки в модальном окне корзины
    document.getElementById('clear-cart-btn').addEventListener('click', clearCart);
    document.getElementById('checkout-btn').addEventListener('click', checkout);
}

// Применение фильтров
function applyFilters(selectedCategoryId = null) {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedGame = gameFilter.value;
    // Убеждаемся, что selectedCategoryId - это число или null, а не event объект
    const selectedCategory = (typeof selectedCategoryId === 'number' || selectedCategoryId === null) ? selectedCategoryId : null;
    const sortBy = sortFilter.value;
    
    // Фильтрация
    filteredProducts = allProducts.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm) ||
                            product.description.toLowerCase().includes(searchTerm);
        const matchesGame = !selectedGame || product.game_id == selectedGame;
        const matchesCategory = !selectedCategory || product.category_id == selectedCategory;
        
        return matchesSearch && matchesGame && matchesCategory;
    });
    
    // Применяем сортировку
    if (sortBy === 'default') {
        // По умолчанию: для конкретной игры - по sort_order, для всех игр - по view_count
        if (selectedGame) {
            // Для конкретной игры сортируем по sort_order
            filteredProducts.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        }
        // Для всех игр товары уже отсортированы по view_count с сервера
    } else {
        // Применяем дополнительную сортировку
        sortProducts(filteredProducts, sortBy);
    }
    
    // Отображение
    displayProducts(filteredProducts);
    updateProductsTitle();
}

// Сортировка товаров
function sortProducts(products, sortBy) {
    switch (sortBy) {
        case 'name':
            products.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'price-asc':
            products.sort((a, b) => a.price - b.price);
            break;
        case 'price-desc':
            products.sort((a, b) => b.price - a.price);
            break;
        case 'newest':
            products.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
    }
}

// Отображение товаров
function displayProducts(products) {
    if (products.length === 0) {
        productsGrid.innerHTML = '';
        noProducts.style.display = 'block';
        return;
    }
    
    noProducts.style.display = 'none';
    productsGrid.innerHTML = '';
    
    products.forEach(product => {
        const productCard = createProductCard(product);
        productsGrid.appendChild(productCard);
    });
}

// Функция для сокращения названия игры
function shortenGameName(gameName) {
    if (!gameName) return '';
    
    // Сокращаем "SCP: Secret Laboratory" до "SCP: SL"
    const lowerName = gameName.toLowerCase();
    if (lowerName.includes('scp') && (lowerName.includes('secret laboratory') || lowerName.includes('secret lab'))) {
        return gameName.replace(/secret laboratory/gi, 'SL').replace(/secret lab/gi, 'SL');
    }
    
    return gameName;
}

// Создание карточки товара
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.addEventListener('click', () => openProductModal(product));
    
    const game = allGames.find(g => g.id === product.game_id);
    const category = allCategories.find(c => c.id === product.category_id);
    
    card.innerHTML = `
        <img src="${product.image_url || '/img/placeholder.png'}" alt="${product.name}" class="product-image">
        <div class="product-info">
            <h3 class="product-name">${product.name}</h3>
            <div class="product-meta">
                ${game ? `<span class="product-game">${shortenGameName(game.name)}</span>` : ''}
                ${category ? `<span class="product-category">${category.name}</span>` : ''}
            </div>
            <div class="product-price">
                ${product.price} <span class="currency">₽</span>
            </div>
        </div>
    `;
    
    return card;
}

// Открытие модального окна товара
function openProductModal(product) {
    const game = allGames.find(g => g.id === product.game_id);
    const category = allCategories.find(c => c.id === product.category_id);
    
    // Увеличиваем счетчик просмотров
    fetch(`/increment-product-view/${product.id}`, { method: 'POST' })
        .catch(error => console.error('Ошибка при увеличении счетчика просмотров:', error));
    
    // Заполняем данные
    document.getElementById('modal-product-image').src = product.image_url || '/img/placeholder.png';
    document.getElementById('modal-product-name').textContent = product.name;
    document.getElementById('modal-product-game').textContent = game ? shortenGameName(game.name) : '';
    document.getElementById('modal-product-category').textContent = category ? category.name : '';
    document.getElementById('modal-product-price').textContent = product.price;
    document.getElementById('modal-product-description').textContent = product.description || 'Описание отсутствует';
    
    // Сохраняем ID товара для кнопок
    document.getElementById('buy-product-btn').dataset.productId = product.id;
    document.getElementById('add-to-cart-btn').dataset.productId = product.id;
    
    // Динамически изменяем размер модального окна в зависимости от длины описания
    adjustModalSize(product.description);
    
    productModal.classList.add('show');
}

// Закрытие модальных окон
function closeModals() {
    productModal.classList.remove('show');
    cartModal.classList.remove('show');
}

// Покупка товара
function buyProduct() {
    const productId = document.getElementById('buy-product-btn').dataset.productId;
    const product = allProducts.find(p => p.id == productId);
    
    if (!product) return;
    
    // Очищаем корзину и добавляем товар
    cart = [product];
    updateCartUI();
    saveCartToStorage();
    
    // Закрываем модальное окно и открываем корзину
    closeModals();
    cartModal.classList.add('show');
}

// Добавление в корзину
function addToCart() {
    const productId = document.getElementById('add-to-cart-btn').dataset.productId;
    const product = allProducts.find(p => p.id == productId);
    
    if (!product) return;
    
    // Проверяем, есть ли уже такой товар в корзине
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
        existingItem.quantity = (existingItem.quantity || 1) + 1;
    } else {
        cart.push({...product, quantity: 1});
    }
    
    updateCartUI();
    saveCartToStorage();
    
    // Показываем уведомление
    showNotification('Товар добавлен в корзину');
}

// Обновление UI корзины
function updateCartUI() {
    // Обновляем счетчик
    const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    cartCount.textContent = totalItems;
    
    // Обновляем содержимое корзины
    updateCartModal();
}

// Обновление модального окна корзины
function updateCartModal() {
    const cartItems = document.getElementById('cart-items');
    const cartTotalPrice = document.getElementById('cart-total-price');
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<p style="text-align: center; color: #888; padding: 20px;">Корзина пуста</p>';
        cartTotalPrice.textContent = '0 ₽';
        return;
    }
    
    cartItems.innerHTML = '';
    let total = 0;
    
    cart.forEach(item => {
        const itemTotal = item.price * (item.quantity || 1);
        total += itemTotal;
        
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <img src="${item.image_url || '/img/placeholder.png'}" alt="${item.name}" class="cart-item-image">
            <div class="cart-item-info">
                <h4 class="cart-item-name">${item.name}</h4>
                <p class="cart-item-price">${item.price} ₽ × ${item.quantity || 1} = ${itemTotal} ₽</p>
            </div>
            <div class="cart-item-controls">
                <button class="quantity-btn" onclick="changeQuantity(${item.id}, -1)">-</button>
                <span class="quantity-display">${item.quantity || 1}</span>
                <button class="quantity-btn" onclick="changeQuantity(${item.id}, 1)">+</button>
                <button class="cart-item-remove" onclick="removeFromCart(${item.id})">Удалить</button>
            </div>
        `;
        cartItems.appendChild(cartItem);
    });
    
    cartTotalPrice.textContent = `${total} ₽`;
}

// Изменение количества товара в корзине
function changeQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (!item) return;
    
    const newQuantity = (item.quantity || 1) + change;
    
    if (newQuantity <= 0) {
        removeFromCart(productId);
    } else {
        item.quantity = newQuantity;
        updateCartUI();
        saveCartToStorage();
    }
}

// Удаление из корзины
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartUI();
    saveCartToStorage();
}

// Очистка корзины
function clearCart() {
    if (confirm('Вы уверены, что хотите очистить корзину?')) {
        cart = [];
        updateCartUI();
        saveCartToStorage();
    }
}

// Оформление заказа
function checkout() {
    if (cart.length === 0) {
        alert('Корзина пуста');
        return;
    }
    
    // Проверяем авторизацию
    fetch("/profile")
        .then(response => {
            if (!response.ok) {
                alert('Для оформления заказа необходимо авторизоваться');
                return;
            }
            return response.json();
        })
        .then(user => {
            if (user) {
                processCheckout(user);
            } else {
                alert('Для оформления заказа необходимо авторизоваться');
            }
        })
        .catch(error => {
            console.error('Ошибка при проверке авторизации:', error);
            alert('Для оформления заказа необходимо авторизоваться');
        });
}

// Обработка оформления заказа
function processCheckout(user) {
    const totalAmount = cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
    
    // Проверяем баланс пользователя
    if (user.balance < totalAmount) {
        alert(`Недостаточно средств на балансе. Необходимо: ${totalAmount} ₽, доступно: ${user.balance} ₽`);
        return;
    }
    
    // Подтверждение заказа
    const confirmMessage = `Подтвердите заказ на сумму ${totalAmount} ₽?\n\nТовары:\n${cart.map(item => 
        `• ${item.name} - ${item.quantity || 1} шт. × ${item.price} ₽`
    ).join('\n')}`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    // Отправляем заказ на сервер
    const orderData = {
        items: cart.map(item => ({
            item_id: item.id,
            quantity: item.quantity || 1,
            price: item.price
        }))
    };
    
    fetch('/create-order', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            alert('Заказ успешно оформлен!');
            // Очищаем корзину
            cart = [];
            updateCartUI();
            saveCartToStorage();
            // Закрываем модальное окно корзины
            cartModal.classList.remove('show');
            // Обновляем баланс пользователя
            const balanceAmount = document.querySelector('.balance-amount');
            if (balanceAmount) {
                balanceAmount.textContent = result.newBalance;
            }
        } else {
            alert('Ошибка при оформлении заказа: ' + result.error);
        }
    })
    .catch(error => {
        console.error('Ошибка при оформлении заказа:', error);
        alert('Ошибка при оформлении заказа');
    });
}

// Сохранение корзины в localStorage
function saveCartToStorage() {
    localStorage.setItem('store_cart', JSON.stringify(cart));
}

// Загрузка корзины из localStorage
function loadCartFromStorage() {
    const savedCart = localStorage.getItem('store_cart');
    if (savedCart) {
        try {
            cart = JSON.parse(savedCart);
        } catch (error) {
            console.error('Ошибка при загрузке корзины:', error);
            cart = [];
        }
    }
}

// Обновление заголовка товаров
function updateProductsTitle() {
    const count = filteredProducts.length;
    productsTitle.textContent = count === allProducts.length ? 'Все товары' : `Найдено товаров: ${count}`;
    productsCount.textContent = `${count} товаров`;
}

// Показ/скрытие индикатора загрузки
function showLoading(show) {
    loadingIndicator.style.display = show ? 'block' : 'none';
    if (show) {
        productsGrid.style.display = 'none';
        noProducts.style.display = 'none';
    } else {
        productsGrid.style.display = 'grid';
    }
}

// Показ ошибки
function showError(message) {
    productsGrid.innerHTML = `<div class="no-products"><p>${message}</p></div>`;
    noProducts.style.display = 'block';
}

// Показ уведомления
function showNotification(message) {
    // Простое уведомление (можно заменить на более красивое)
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #28a745;
        color: white;
        padding: 15px 20px;
        border-radius: 6px;
        z-index: 10000;
        font-weight: bold;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        document.body.removeChild(notification);
    }, 3000);
}

// Функция debounce для оптимизации поиска
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Функция для динамического изменения размера модального окна
function adjustModalSize(description) {
    const modalContent = document.querySelector('.product-modal-content');
    if (!modalContent) return;
    
    // Убираем все классы размеров
    modalContent.classList.remove('modal-small', 'modal-medium', 'modal-large');
    
    // Определяем длину описания
    const descriptionLength = description ? description.length : 0;
    
    // Применяем соответствующий класс в зависимости от длины описания
    if (descriptionLength <= 50) {
        // Короткое описание - стандартный размер (800px)
        modalContent.classList.add('modal-small');
    } else if (descriptionLength <= 200) {
        // Среднее описание - средний размер (1000px)
        modalContent.classList.add('modal-medium');
    } else {
        // Длинное описание - большой размер (1200px)
        modalContent.classList.add('modal-large');
    }
}
