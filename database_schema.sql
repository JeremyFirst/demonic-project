-- Создание базы данных для Demonic Project
-- Восстановление структуры БД

CREATE DATABASE IF NOT EXISTS demonic_project;
USE demonic_project;

-- Таблица пользователей (Steam авторизация)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    steam_id VARCHAR(17) UNIQUE NOT NULL,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NULL,
    balance DECIMAL(10,2) DEFAULT 0.00,
    discount INT DEFAULT 0,
    role ENUM('user', 'admin', 'moderator') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    reset_ban_until TIMESTAMP NULL
);

-- Таблица администраторов
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'super_admin') DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Таблица игр
CREATE TABLE IF NOT EXISTS games (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица категорий товаров
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    game_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE SET NULL
);

-- Таблица товаров
CREATE TABLE IF NOT EXISTS items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image_url VARCHAR(500),
    game_id INT,
    category_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Таблица сброса паролей
CREATE TABLE IF NOT EXISTS password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Таблица заказов (для будущего развития)
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Таблица элементов заказа
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity INT DEFAULT 1,
    price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

-- Вставка базовых данных

-- Добавляем игры
INSERT INTO games (id, name, description) VALUES 
(1, 'Minecraft', 'Песочница для строительства и выживания'),
(2, 'RUST', 'Многопользовательская игра на выживание'),
(3, 'SCP: Secret Laboratory', 'Хоррор игра на основе SCP Foundation');

-- Добавляем категории
INSERT INTO categories (id, name, description, game_id) VALUES 
(1, 'Ресурсы', 'Основные ресурсы для игры', 1),
(2, 'Инструменты', 'Инструменты и оружие', 1),
(3, 'Ресурсы', 'Основные ресурсы для выживания', 2),
(4, 'Оружие', 'Оружие и боеприпасы', 2),
(5, 'SCP объекты', 'Специальные SCP объекты', 3),
(6, 'Экипировка', 'Защитная экипировка', 3);

-- Создаем тестового администратора (пароль: admin123)
-- Сначала создаем пользователя
INSERT INTO users (steam_id, username, email, role) VALUES 
('76561198000000000', 'admin', 'admin@demonic-project.com', 'admin');

-- Затем создаем запись администратора
INSERT INTO admins (user_id, username, password_hash) VALUES 
(1, 'admin', '$2b$10$rQZ8K9vL2mN3oP4qR5sT6uV7wX8yZ9aB0cD1eF2gH3iJ4kL5mN6oP7qR8sT9uV');

-- Добавляем тестовые товары
INSERT INTO items (name, description, price, image_url, game_id, category_id) VALUES 
('Алмаз', 'Редкий ресурс для крафта', 100.00, '/img/diamond.png', 1, 1),
('Железная кирка', 'Прочный инструмент для добычи', 50.00, '/img/iron_pickaxe.png', 1, 2),
('Металлолом', 'Основной ресурс в RUST', 25.00, '/img/scrap.png', 2, 3),
('АК-47', 'Автоматическое оружие', 200.00, '/img/ak47.png', 2, 4),
('SCP-173', 'Опасный SCP объект', 500.00, '/img/scp173.png', 3, 5),
('Защитный костюм', 'Защита от SCP', 150.00, '/img/hazmat.png', 3, 6);

-- Создаем индексы для оптимизации
CREATE INDEX idx_users_steam_id ON users(steam_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_admins_username ON admins(username);
CREATE INDEX idx_items_game_id ON items(game_id);
CREATE INDEX idx_items_category_id ON items(category_id);
CREATE INDEX idx_password_resets_token ON password_resets(token);
CREATE INDEX idx_password_resets_expires ON password_resets(expires_at);
