require('dotenv').config();  // Загружаем переменные из .env
const express = require('express');  // Подключаем Express
const app = express();  // Инициализируем объект app
const session = require('express-session');  // Подключаем сессии
const cookieParser = require('cookie-parser');  // Подключаем cookie-parser
const passport = require('passport');  // Подключаем Passport для аутентификации
const SteamStrategy = require('passport-steam').Strategy;  // Подключаем Steam Strategy для аутентификации
const mysql = require('mysql2');  // Подключаем mysql2 для работы с базой данных
const fetch = require('node-fetch');  // Для запросов к Steam API
const path = require('path');  // Для работы с путями файлов
const bcrypt = require('bcrypt');  // Подключаем bcrypt для хеширования паролей
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const multer = require('multer');
// Создаем папку для загрузки изображений
const upload = multer({
    dest: 'uploads/', // Папка для хранения изображений
    limits: { fileSize: 10 * 1024 * 1024 }, // Максимальный размер файла 10MB
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/; // Разрешенные типы файлов
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        return cb(new Error('Неподдерживаемый формат файла.'));
    }
});

const port = process.env.PORT || 3000;  // Порт, на котором будет работать сервер

// Настройка сессий
app.use(session({
    secret: process.env.SESSION_SECRET,  // Секрет для сессий
    resave: false,
    saveUninitialized: true
}));

// Настройка cookie-parser
app.use(cookieParser());

// Подключение к базе данных
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Проверка подключения к базе данных
db.connect(err => {
    if (err) {
        console.error('Ошибка подключения к базе данных:', err);
    } else {
        console.log('Подключено к базе данных.');
    }
});

// Инициализация Passport
app.use(passport.initialize());
app.use(passport.session());

// Steam стратегия (должна быть ДО маршрутов)
console.log('Steam API Key:', process.env.STEAM_API_KEY ? 'Настроен' : 'НЕ НАСТРОЕН');

passport.use(new SteamStrategy({
    returnURL: 'http://localhost:3000/auth/steam/return',
    realm: 'http://localhost:3000/',
    apiKey: process.env.STEAM_API_KEY
}, (identifier, profile, done) => {
    const steamId = profile.id;
    const displayName = profile.displayName;

    // Проверяем пользователя в базе данных
    db.query('SELECT * FROM users WHERE steam_id = ?', [steamId], (err, results) => {
        if (err) return done(err);

        if (results.length > 0) {
            return done(null, results[0]);  // Пользователь найден
        } else {
            // Если пользователя нет, создаем его
            db.query('INSERT INTO users (steam_id, username, created_at) VALUES (?, ?, NOW())',
                [steamId, displayName], (err, result) => {
                    if (err) return done(err);

                    db.query('SELECT * FROM users WHERE id = ?', [result.insertId], (err, newUser) => {
                        if (err) return done(err);
                        return done(null, newUser[0]);
                    });
                });
        }
    });
}));

// Сериализация пользователя
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Десериализация пользователя
passport.deserializeUser((id, done) => {
    db.query('SELECT * FROM users WHERE id = ?', [id], (err, results) => {
        if (err) return done(err);
        done(null, results[0]);
    });
});

// Подключаем статические файлы (CSS, JS, изображения)
app.use(express.static(path.join(__dirname, 'public')));

// Для обработки JSON-запросов
app.use(express.json({ limit: '50mb' })); // Увеличиваем лимит на 50mb

// Отдаем главную страницу
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'Index.html'));
});

// Маршрут для Steam авторизации с сохранением предыдущей страницы
app.get('/auth/steam', (req, res, next) => {
    // Сохраняем returnUrl в cookie (более надежно чем сессия)
    const returnUrl = req.query.returnUrl || req.headers.referer || '/profile.html';
    res.cookie('returnUrl', returnUrl, { 
        maxAge: 5 * 60 * 1000, // 5 минут
        httpOnly: true,
        secure: false // для localhost
    });
    
    passport.authenticate('steam')(req, res, next);
});

// После авторизации вернуть игрока на предыдущую страницу
app.get('/auth/steam/return',
    passport.authenticate('steam', { failureRedirect: '/' }),
    (req, res) => {
        const returnTo = req.cookies.returnUrl || req.query.returnUrl || req.session.returnTo || '/profile.html';
        
        // Очищаем cookie
        res.clearCookie('returnUrl');
        delete req.session.returnTo;
        res.redirect(returnTo);
    });

// Маршрут для выхода
app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error('Ошибка при выходе:', err);
        }
        res.redirect('/');
    });
});


// Получение профиля
app.get('/profile', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Не авторизован' });  // Отправляем JSON
    }

    // Получаем данные пользователя из базы данных
    db.query('SELECT * FROM users WHERE steam_id = ?', [req.user.steam_id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Ошибка при получении данных' });
        }

        if (results.length > 0) {
            const user = results[0];
            res.json({
                id: user.id,
                username: user.username,
                steam_id: user.steam_id,
                balance: user.balance,
                discount: user.discount,
                role: user.role // Отправляем роль пользователя
            });
        } else {
            res.status(404).json({ error: 'Пользователь не найден' });
        }
    });
});

// Маршрут для Steam-аватара
app.get('/steam-avatar/:steamid', async (req, res) => {
    const steamId = req.params.steamid;
    console.log(`Запрос на аватар для Steam ID: ${steamId}`);

    try {
        const steamApiKey = process.env.STEAM_API_KEY;
        const steamUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${steamApiKey}&steamids=${steamId}`;
        const response = await fetch(steamUrl);
        const data = await response.json();

        if (data.response.players.length > 0) {
            const avatar = data.response.players[0].avatarfull;
            console.log(`Аватар загружен с Steam API для Steam ID: ${steamId}`);
            console.log(`URL аватара: ${avatar}`);  // Логируем URL аватара

            // Отдаем URL аватара
            res.json({ avatarUrl: avatar });
        } else {
            console.log(`Пользователь Steam не найден для ID: ${steamId}`);
            return res.status(404).json({ error: "Пользователь Steam не найден" });
        }
    } catch (error) {
        console.error("Ошибка получения аватара Steam:", error);
        res.status(500).json({ error: "Ошибка сервера Steam API" });
    }
});

// Обновление email пользователя
app.post('/profile/update-email', (req, res) => {
    const { email, userId } = req.body;

    console.log('Запрос на обновление email:', req.body);

    if (!email || !userId) {
        return res.status(400).json({ error: 'Email и ID пользователя обязательны' });
    }

    db.query('UPDATE users SET email = ? WHERE id = ?', [email, userId], (err, result) => {
        if (err) {
            console.error('Ошибка при обновлении email:', err);
            return res.status(500).json({ error: 'Ошибка при обновлении email' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        res.status(200).json({ message: 'Email успешно обновлен' });
    });
});

app.post('/admin/login', (req, res) => {
    const { login, password } = req.body;
    
    // Проверка на наличие логина и пароля
    if (!login || !password) {
        console.error('Логин или пароль не были переданы');
        return res.status(400).json({ error: 'Логин и пароль обязательны' });
    }

    console.log(`Пытаемся найти пользователя с логином: ${login}`); // Логируем логин

    db.query('SELECT *, is_temp_password FROM admins WHERE username = ?', [login], (err, results) => {
        if (err) {
            console.error('Ошибка при выполнении запроса в БД:', err); // Логируем ошибку БД
            return res.status(500).json({ error: 'Ошибка при проверке данных' });
        }
    
        if (results.length === 0) {
            console.log('Пользователь не найден');
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }
    
        const user = results[0];
        console.log('Пользователь найден. Сравниваем пароли...');
    
        bcrypt.compare(password, user.password_hash, (err, isMatch) => {
            if (err) {
                console.error('Ошибка при сравнении паролей:', err);
                return res.status(500).json({ error: 'Ошибка при сравнении паролей' });
            }
    
            if (!isMatch) {
                console.log('Пароль неверный');
                return res.status(401).json({ error: 'Неверный логин или пароль' });
            }
    
            console.log('Пароль совпадает!');
            req.session.user = { id: user.id, username: user.username, role: user.role }; // Добавляем роль в сессию

            console.log('Ответ с сервером: ', { username: user.username, role: user.role, isTempPassword: user.is_temp_password }); // Логирование ответа
    
            return res.status(200).json({ 
                message: 'Успешная авторизация', 
                username: user.username, 
                role: user.role,
                isTempPassword: user.is_temp_password || false
            });
        });
    });
    
});

app.get('/admin/dashboard', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Вы не авторизованы' });
    }

    // Проверка роли в таблице users
    db.query('SELECT role FROM users WHERE id = ?', [req.session.user.id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Ошибка при проверке роли' });
        }

        if (results.length === 0 || results[0].role !== 'admin') {
            return res.status(403).json({ error: 'Доступ запрещен. У вас нет прав администратора.' });
        }

        // Если роль "admin", даем доступ к админ-панели
        res.send('Добро пожаловать в админ-панель');
    });
});

app.post('/admin/request-password-reset', (req, res) => {
    const { login } = req.body;

    if (!login) return res.status(400).json({ error: 'Введите логин' });

    // Ищем админа по логину
    db.query('SELECT * FROM admins WHERE username = ?', [login], (err, adminResults) => {
        if (err) {
            console.error("Ошибка при запросе admin:", err); // Логируем ошибку
            return res.status(500).json({ error: 'Ошибка при обработке запроса.' });
        }
        if (adminResults.length === 0) return res.status(404).json({ error: 'Неверный логин' });

        const admin = adminResults[0];

        // Ищем email через связанный user_id
        db.query('SELECT email FROM users WHERE id = ?', [admin.user_id], (err, userResults) => {
            if (err) {
                console.error("Ошибка при запросе email:", err); // Логируем ошибку
                return res.status(500).json({ error: 'Ошибка при получении email.' });
            }
            if (userResults.length === 0 || !userResults[0].email) {
                return res.status(200).json({ info: 'Обратитесь к Jeremy – email отсутствует' });
            }

            const email = userResults[0].email;

            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 3600000); // Через 1 час
            const expiresAtFormatted = expiresAt.toISOString().slice(0, 19).replace('T', ' '); // Преобразуем в формат, который MySQL ожидает
            console.log(`Токен создан: ${token}`); // Логируем созданный токен
            console.log(`Токен истекает: ${expiresAt.toISOString()}`); // Логируем время истечения
            
            
            db.query(
                'INSERT INTO password_resets (user_id, token, created_at, expires_at) VALUES (?, ?, ?, ?)',
                [admin.user_id, token, new Date(), expiresAtFormatted],
                (err) => {
                    if (err) {
                        console.error("Ошибка при сохранении токена:", err);
                        return res.status(500).json({ error: 'Ошибка при сохранении токена' });
                    }
                    console.log(`Токен успешно сохранен в базе данных для пользователя с ID ${admin.user_id}`);
                    sendPasswordResetEmail(email, token); // Отправка письма
                }
            );
        });
    });
});

function sendPasswordResetEmail(email, token) {
    const resetUrl = `http://localhost:3000/reset-password.html?token=${token}`;

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
 
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Восстановление пароля администратора',
        text: `Сбросить пароль: ${resetUrl}`
    };

    console.log("Токен перед отправкой:", token);
    transporter.sendMail(mailOptions, (err, info) => {
        if (err) console.error('Ошибка отправки письма:', err);
        else console.log('Письмо отправлено:', info.response);
    });
}

app.post('/admin/reset-password', (req, res) => {
    const { login, new_password, confirm_password, token } = req.body;

    console.log(`Получен запрос на сброс пароля с данными:`);
    console.log(`login: ${login}, new_password: ${new_password}, confirm_password: ${confirm_password}, token: ${token}`);

    if (new_password !== confirm_password) {
        console.log(`Пароли не совпадают. Токен: ${token}`);
        return res.status(400).json({ error: 'Пароли не совпадают' });
    }

    console.log(`Токен из запроса: ${token}`);
    console.log(`Запрос в базу данных для проверки: SELECT * FROM password_resets WHERE token = ${token} AND expires_at > UTC_TIMESTAMP()`);
    db.query('SELECT * FROM password_resets WHERE token = ? AND expires_at > UTC_TIMESTAMP()', [token], (err, resetResults) => {
        if (err) return res.status(500).json({ error: 'Ошибка при проверке токена' });
        console.log("Результаты запроса:", resetResults);

        if (resetResults.length === 0) {
            console.log(`Токен ${token} недействителен или истёк. Время истечения в базе: ${resetResults[0]?.expires_at}`);
            return res.status(400).json({ error: 'Недействительный или истёкший токен' });
        }

        const resetData = resetResults[0];
        console.log(`Токен ${token} найден. Время истечения: ${resetData.expires_at}`);
        const resetUserId = resetData.user_id;

        // Проверка логина
        db.query('SELECT * FROM admins WHERE username = ?', [login], (err, adminResults) => {
            if (err) return res.status(500).json({ error: 'Ошибка при проверке логина' });

            if (adminResults.length === 0 || adminResults[0].user_id !== resetUserId) {
                db.query('DELETE FROM password_resets WHERE token = ?', [token]);

                // Блокируем email на 2 часа
                const banUntil = new Date(Date.now() + 2 * 60 * 60 * 1000);
                db.query('UPDATE users SET reset_ban_until = ? WHERE id = ?', [banUntil, resetUserId]);

                return res.status(403).json({ error: 'Неверный логин. Токен аннулирован, доступ заблокирован.' });
            }

            const hashedPassword = bcrypt.hashSync(new_password, 10);
            console.log("Хешированный пароль:", hashedPassword); // Логируем хешированный пароль
            db.query('UPDATE admins SET password_hash = ? WHERE username = ?', [hashedPassword, login], (err, result) => {
                if (err) {
                    console.error('Ошибка при обновлении пароля:', err);
                    return res.status(500).json({ error: 'Ошибка при обновлении пароля' });
                }
            
                // Используем переменную result для вывода информации о выполнении запроса
                console.log('Пароль успешно обновлен:', result); // Логируем успешное обновление пароля
            
                db.query('DELETE FROM password_resets WHERE token = ?', [token], (deleteErr) => {
                    if (deleteErr) {
                        console.error('Ошибка при удалении токена:', deleteErr);
                    }
                });
                return res.status(200).json({ success: 'Пароль успешно сброшен' });
            });
        });
    });
});

app.post('/add-product', upload.single('product-image'), (req, res) => {
    const { name, description, price, game_id, category_id } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;

    const query = `INSERT INTO items (name, description, price, image_url, game_id, category_id) VALUES (?, ?, ?, ?, ?, ?)`;

    db.query(query, [name, description, price, image_url, game_id, category_id], (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).send({ message: 'Ошибка при добавлении товара' });
        }
        res.send({ message: 'Товар добавлен!' });
    });
});

// Маршрут для получения списка товаров
app.get('/get-products', (req, res) => {
    db.query('SELECT * FROM items', (err, results) => {
        if (err) {
            console.error('Ошибка при запросе товаров:', err);
            return res.status(500).json({ error: 'Ошибка при получении товаров' });
        }
        res.json(results);  // Ответ возвращается здесь, res доступна
    });
});

// Endpoint для клиентской части магазина
app.get('/get-items', (req, res) => {
    // Всегда возвращаем все товары, сортированные по популярности
    // Конкретная сортировка по играм будет происходить на клиенте
    const query = `
        SELECT i.*, g.name as game_name, c.name as category_name 
        FROM items i
        LEFT JOIN games g ON i.game_id = g.id
        LEFT JOIN categories c ON i.category_id = c.id
        WHERE i.is_active = TRUE
        ORDER BY i.view_count DESC, i.created_at DESC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Ошибка при запросе товаров для магазина:', err);
            return res.status(500).json({ error: 'Ошибка при получении товаров' });
        }
        res.json(results);
    });
});

// Endpoint для увеличения счетчика просмотров товара
app.post('/increment-product-view/:id', (req, res) => {
    const productId = req.params.id;
    
    db.query('UPDATE items SET view_count = view_count + 1 WHERE id = ?', [productId], (err, result) => {
        if (err) {
            console.error('Ошибка при увеличении счетчика просмотров:', err);
            return res.status(500).json({ error: 'Ошибка при обновлении счетчика просмотров' });
        }
        res.json({ success: true });
    });
});

app.put('/edit-product/:id', (req, res) => {
    console.log('Получен PUT-запрос для обновления товара с ID:', req.params.id);  // Логируем запрос
    const productId = req.params.id;
    const { name, price, description, image_url, game_id, category_id } = req.body;

    // Выполняем запрос на обновление товара
    db.query(
        'UPDATE items SET name = ?, price = ?, description = ?, image_url = ?, game_id = ?, category_id = ? WHERE id = ?',
        [name, price, description, image_url, game_id, category_id, productId],
        (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: 'Ошибка при обновлении товара' });
            }
            console.log('Товар обновлен с ID:', productId);  // Логируем успешное обновление
            res.json({ message: 'Товар обновлен!' });
        }
    );
});


app.delete('/delete-product/:id', (req, res) => {
    console.log('Получен DELETE-запрос для удаления товара с ID:', req.params.id);  // Логируем запрос
    const productId = req.params.id;

    // Удаление товара из базы данных
    db.query('DELETE FROM items WHERE id = ?', [productId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Ошибка при удалении товара' });
        }
        console.log('Товар с ID удален:', productId);  // Логируем успешное удаление
        res.json({ message: 'Товар удален' });
    });
});

// Маршруты для управления категориями

// Получение всех категорий
app.get('/get-categories', (req, res) => {
    db.query(`
        SELECT c.*, g.name as game_name 
        FROM categories c 
        LEFT JOIN games g ON c.game_id = g.id 
        ORDER BY c.game_id, c.name
    `, (err, results) => {
        if (err) {
            console.error('Ошибка при запросе категорий:', err);
            return res.status(500).json({ error: 'Ошибка при получении категорий' });
        }
        res.json(results);
    });
});

// Получение категорий по игре
app.get('/get-categories-by-game/:gameId', (req, res) => {
    const gameId = req.params.gameId;
    
    db.query(`
        SELECT c.*, g.name as game_name 
        FROM categories c 
        LEFT JOIN games g ON c.game_id = g.id 
        WHERE c.game_id = ?
        ORDER BY c.name
    `, [gameId], (err, results) => {
        if (err) {
            console.error('Ошибка при запросе категорий по игре:', err);
            return res.status(500).json({ error: 'Ошибка при получении категорий' });
        }
        
        res.json(results);
    });
});

// Добавление новой категории
app.post('/add-category', (req, res) => {
    const { name, description, game_id } = req.body;

    if (!name || !game_id) {
        return res.status(400).json({ error: 'Название категории и игра обязательны' });
    }

    const query = `INSERT INTO categories (name, description, game_id) VALUES (?, ?, ?)`;

    db.query(query, [name, description, game_id], (err, result) => {
        if (err) {
            console.error('Ошибка при добавлении категории:', err);
            return res.status(500).json({ error: 'Ошибка при добавлении категории' });
        }
        res.json({ message: 'Категория добавлена!', id: result.insertId });
    });
});

// Редактирование категории
app.put('/edit-category/:id', (req, res) => {
    const categoryId = req.params.id;
    const { name, description, game_id } = req.body;

    console.log('Получен PUT-запрос для обновления категории с ID:', categoryId);

    db.query(
        'UPDATE categories SET name = ?, description = ?, game_id = ? WHERE id = ?',
        [name, description, game_id, categoryId],
        (err, result) => {
            if (err) {
                console.error('Ошибка при обновлении категории:', err);
                return res.status(500).json({ error: 'Ошибка при обновлении категории' });
            }
            console.log('Категория обновлена с ID:', categoryId);
            res.json({ message: 'Категория обновлена!' });
        }
    );
});

// Удаление категории
app.delete('/delete-category/:id', (req, res) => {
    const categoryId = req.params.id;

    console.log('Получен DELETE-запрос для удаления категории с ID:', categoryId);

    // Сначала проверяем, есть ли товары в этой категории
    db.query('SELECT COUNT(*) as count FROM items WHERE category_id = ?', [categoryId], (err, results) => {
        if (err) {
            console.error('Ошибка при проверке товаров в категории:', err);
            return res.status(500).json({ error: 'Ошибка при проверке категории' });
        }

        if (results[0].count > 0) {
            return res.status(400).json({ 
                error: 'Нельзя удалить категорию, в которой есть товары. Сначала переместите или удалите товары.' 
            });
        }

        // Удаляем категорию
        db.query('DELETE FROM categories WHERE id = ?', [categoryId], (err, result) => {
            if (err) {
                console.error('Ошибка при удалении категории:', err);
                return res.status(500).json({ error: 'Ошибка при удалении категории' });
            }
            console.log('Категория с ID удалена:', categoryId);
            res.json({ message: 'Категория удалена' });
        });
    });
});



// Маршруты для управления администраторами

// Получение всех администраторов
app.get('/get-admins', (req, res) => {
    db.query(`
        SELECT a.*, u.username 
        FROM admins a 
        LEFT JOIN users u ON a.user_id = u.id 
        ORDER BY a.created_at DESC
    `, (err, results) => {
        if (err) {
            console.error('Ошибка при запросе администраторов:', err);
            return res.status(500).json({ error: 'Ошибка при получении администраторов' });
        }
        res.json(results);
    });
});

// Получение всех пользователей
app.get('/get-users', (req, res) => {
    db.query(`
        SELECT id, username, steam_id 
        FROM users 
        WHERE id NOT IN (SELECT user_id FROM admins WHERE user_id IS NOT NULL)
        ORDER BY username
    `, (err, results) => {
        if (err) {
            console.error('Ошибка при запросе пользователей:', err);
            return res.status(500).json({ error: 'Ошибка при получении пользователей' });
        }
        res.json(results);
    });
});

// Добавление нового администратора
app.post('/add-admin', (req, res) => {
    const { user_id, role } = req.body;

    if (!user_id || !role) {
        return res.status(400).json({ error: 'ID пользователя и роль обязательны' });
    }

    // Проверяем, не является ли пользователь уже администратором
    db.query('SELECT id FROM admins WHERE user_id = ?', [user_id], (err, results) => {
        if (err) {
            console.error('Ошибка при проверке администратора:', err);
            return res.status(500).json({ error: 'Ошибка при проверке администратора' });
        }

        if (results.length > 0) {
            return res.status(400).json({ error: 'Этот пользователь уже является администратором' });
        }

        // Получаем username пользователя
        db.query('SELECT username FROM users WHERE id = ?', [user_id], (err, userResults) => {
            if (err) {
                console.error('Ошибка при получении username:', err);
                return res.status(500).json({ error: 'Ошибка при получении данных пользователя' });
            }

            if (userResults.length === 0) {
                return res.status(400).json({ error: 'Пользователь не найден' });
            }

            const username = userResults[0].username;

            // Генерируем временный пароль
            const tempPassword = Math.random().toString(36).slice(-8); // 8-символьный пароль
            const hashedPassword = bcrypt.hashSync(tempPassword, 10);

            // Добавляем администратора с временным паролем
            db.query('INSERT INTO admins (user_id, username, password_hash, role, is_temp_password) VALUES (?, ?, ?, ?, ?)', 
                [user_id, username, hashedPassword, role, true], (err, result) => {
                if (err) {
                    console.error('Ошибка при добавлении администратора:', err);
                    return res.status(500).json({ error: 'Ошибка при добавлении администратора' });
                }

                // Обновляем роль пользователя в таблице users
                db.query('UPDATE users SET role = ? WHERE id = ?', [role, user_id], (err, updateResult) => {
                    if (err) {
                        console.error('Ошибка при обновлении роли пользователя:', err);
                        // Не возвращаем ошибку, так как администратор уже добавлен
                    }
                    
                    res.json({ 
                        message: 'Администратор добавлен!', 
                        id: result.insertId,
                        tempPassword: tempPassword // Возвращаем временный пароль
                    });
                });
            });
        });
    });
});

// Редактирование администратора
app.put('/edit-admin/:id', (req, res) => {
    const adminId = req.params.id;
    const { user_id, role } = req.body;

    console.log('Получен PUT-запрос для обновления администратора с ID:', adminId);

    // Получаем username пользователя
    db.query('SELECT username FROM users WHERE id = ?', [user_id], (err, userResults) => {
        if (err) {
            console.error('Ошибка при получении username:', err);
            return res.status(500).json({ error: 'Ошибка при получении данных пользователя' });
        }

        if (userResults.length === 0) {
            return res.status(400).json({ error: 'Пользователь не найден' });
        }

        const username = userResults[0].username;

        db.query(
            'UPDATE admins SET user_id = ?, username = ?, role = ? WHERE id = ?',
            [user_id, username, role, adminId],
            (err, result) => {
                if (err) {
                    console.error('Ошибка при обновлении администратора:', err);
                    return res.status(500).json({ error: 'Ошибка при обновлении администратора' });
                }

                // Обновляем роль пользователя в таблице users
                db.query('UPDATE users SET role = ? WHERE id = ?', [role, user_id], (err, updateResult) => {
                    if (err) {
                        console.error('Ошибка при обновлении роли пользователя:', err);
                        // Не возвращаем ошибку, так как администратор уже обновлен
                    }
                    
                    console.log('Администратор обновлен с ID:', adminId);
                    res.json({ message: 'Администратор обновлен!' });
                });
            }
        );
    });
});

// Удаление администратора
app.delete('/delete-admin/:id', (req, res) => {
    const adminId = req.params.id;

    console.log('Получен DELETE-запрос для удаления администратора с ID:', adminId);

    // Сначала получаем user_id администратора
    db.query('SELECT user_id FROM admins WHERE id = ?', [adminId], (err, adminResult) => {
        if (err) {
            console.error('Ошибка при получении данных администратора:', err);
            return res.status(500).json({ error: 'Ошибка при получении данных администратора' });
        }

        if (adminResult.length === 0) {
            return res.status(400).json({ error: 'Администратор не найден' });
        }

        const userId = adminResult[0].user_id;

        // Удаляем администратора
        db.query('DELETE FROM admins WHERE id = ?', [adminId], (err, result) => {
            if (err) {
                console.error('Ошибка при удалении администратора:', err);
                return res.status(500).json({ error: 'Ошибка при удалении администратора' });
            }

            // Обновляем роль пользователя обратно на 'user'
            db.query('UPDATE users SET role = ? WHERE id = ?', ['user', userId], (err, updateResult) => {
                if (err) {
                    console.error('Ошибка при обновлении роли пользователя:', err);
                    // Не возвращаем ошибку, так как администратор уже удален
                }
                
                console.log('Администратор с ID удален:', adminId);
                res.json({ message: 'Администратор удален' });
            });
        });
    });
});

// Получение ID администратора по username
app.get('/get-admin-id/:username', (req, res) => {
    const username = req.params.username;
    
    db.query('SELECT id FROM admins WHERE username = ?', [username], (err, results) => {
        if (err) {
            console.error('Ошибка при получении ID администратора:', err);
            return res.status(500).json({ error: 'Ошибка при получении ID администратора' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'Администратор не найден' });
        }
        
        res.json({ adminId: results[0].id });
    });
});

// Проверка временного пароля администратора
app.get('/check-temp-password/:username', (req, res) => {
    const username = req.params.username;
    
    db.query('SELECT is_temp_password FROM admins WHERE username = ?', [username], (err, results) => {
        if (err) {
            console.error('Ошибка при проверке временного пароля:', err);
            return res.status(500).json({ error: 'Ошибка при проверке временного пароля' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'Администратор не найден' });
        }
        
        res.json({ isTempPassword: results[0].is_temp_password });
    });
});

// Смена пароля администратора
app.post('/change-admin-password', (req, res) => {
    const { adminId, currentPassword, newPassword } = req.body;

    if (!adminId || !currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Все поля обязательны' });
    }

    // Проверяем текущий пароль
    db.query('SELECT password_hash FROM admins WHERE id = ?', [adminId], (err, results) => {
        if (err) {
            console.error('Ошибка при проверке пароля:', err);
            return res.status(500).json({ error: 'Ошибка при проверке пароля' });
        }

        if (results.length === 0) {
            return res.status(400).json({ error: 'Администратор не найден' });
        }

        const storedHash = results[0].password_hash;

        // Проверяем текущий пароль
        if (!bcrypt.compareSync(currentPassword, storedHash)) {
            return res.status(400).json({ error: 'Неверный текущий пароль' });
        }

        // Хешируем новый пароль
        const newPasswordHash = bcrypt.hashSync(newPassword, 10);

        // Обновляем пароль и отмечаем, что это больше не временный пароль
        db.query('UPDATE admins SET password_hash = ?, is_temp_password = ? WHERE id = ?', [newPasswordHash, false, adminId], (err, result) => {
            if (err) {
                console.error('Ошибка при смене пароля:', err);
                return res.status(500).json({ error: 'Ошибка при смене пароля' });
            }
            res.json({ message: 'Пароль успешно изменен!' });
        });
    });
});

// ========== МАРШРУТЫ ДЛЯ УПРАВЛЕНИЯ СКИДКАМИ ==========

// Получение всех скидок
app.get('/get-discounts', (req, res) => {
    db.query(`
        SELECT d.*, 
               g.name as game_name,
               c.name as category_name,
               i.name as product_name
        FROM discounts d
        LEFT JOIN games g ON d.target_type = 'game' AND d.target_id = g.id
        LEFT JOIN categories c ON d.target_type = 'category' AND d.target_id = c.id
        LEFT JOIN items i ON d.target_type = 'product' AND d.target_id = i.id
        ORDER BY d.created_at DESC
    `, (err, results) => {
        if (err) {
            console.error('Ошибка при запросе скидок:', err);
            return res.status(500).json({ error: 'Ошибка при получении скидок' });
        }
        res.json(results);
    });
});

// Получение всех игр
app.get('/get-games', (req, res) => {
    db.query('SELECT * FROM games ORDER BY name', (err, results) => {
        if (err) {
            console.error('Ошибка при запросе игр:', err);
            return res.status(500).json({ error: 'Ошибка при получении игр' });
        }
        res.json(results);
    });
});

// Добавление новой скидки
app.post('/add-discount', (req, res) => {
    const { name, description, type, value, start_date, end_date, target_type, target_id, status } = req.body;

    if (!name || !type || !value || !start_date || !end_date) {
        return res.status(400).json({ error: 'Название, тип, размер скидки и даты обязательны' });
    }

    // Проверяем корректность дат
    if (new Date(start_date) >= new Date(end_date)) {
        return res.status(400).json({ error: 'Дата окончания должна быть позже даты начала' });
    }

    const query = `INSERT INTO discounts (name, description, type, value, start_date, end_date, target_type, target_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.query(query, [name, description, type, value, start_date, end_date, target_type, target_id || null, status], (err, result) => {
        if (err) {
            console.error('Ошибка при добавлении скидки:', err);
            return res.status(500).json({ error: 'Ошибка при добавлении скидки' });
        }
        res.json({ message: 'Скидка добавлена!', id: result.insertId });
    });
});

// Редактирование скидки
app.put('/edit-discount/:id', (req, res) => {
    const discountId = req.params.id;
    const { name, description, type, value, start_date, end_date, target_type, target_id, status } = req.body;

    console.log('Получен PUT-запрос для обновления скидки с ID:', discountId);

    // Проверяем корректность дат
    if (new Date(start_date) >= new Date(end_date)) {
        return res.status(400).json({ error: 'Дата окончания должна быть позже даты начала' });
    }

    db.query(
        'UPDATE discounts SET name = ?, description = ?, type = ?, value = ?, start_date = ?, end_date = ?, target_type = ?, target_id = ?, status = ? WHERE id = ?',
        [name, description, type, value, start_date, end_date, target_type, target_id || null, status, discountId],
        (err, result) => {
            if (err) {
                console.error('Ошибка при обновлении скидки:', err);
                return res.status(500).json({ error: 'Ошибка при обновлении скидки' });
            }
            console.log('Скидка обновлена с ID:', discountId);
            res.json({ message: 'Скидка обновлена!' });
        }
    );
});

// Удаление скидки
app.delete('/delete-discount/:id', (req, res) => {
    const discountId = req.params.id;

    console.log('Получен DELETE-запрос для удаления скидки с ID:', discountId);

    db.query('DELETE FROM discounts WHERE id = ?', [discountId], (err, result) => {
        if (err) {
            console.error('Ошибка при удалении скидки:', err);
            return res.status(500).json({ error: 'Ошибка при удалении скидки' });
        }
        console.log('Скидка с ID удалена:', discountId);
        res.json({ message: 'Скидка удалена' });
    });
});

// ========== API ENDPOINTS ДЛЯ ПРОМОКОДОВ ==========

// Получение всех промокодов
app.get('/get-promocodes', (req, res) => {
    db.query(`
        SELECT p.*, 
               g.name as game_name,
               c.name as category_name,
               i.name as product_name
        FROM promocodes p
        LEFT JOIN games g ON p.target_type = 'game' AND p.target_id = g.id
        LEFT JOIN categories c ON p.target_type = 'category' AND p.target_id = c.id
        LEFT JOIN items i ON p.target_type = 'product' AND p.target_id = i.id
        ORDER BY p.created_at DESC
    `, (err, results) => {
        if (err) {
            console.error('Ошибка при запросе промокодов:', err);
            return res.status(500).json({ error: 'Ошибка при получении промокодов' });
        }
        res.json(results);
    });
});

// Добавление нового промокода
app.post('/add-promocode', (req, res) => {
    const { code, description, type, value, start_date, end_date, target_type, target_id, usage_limit, status } = req.body;

    console.log('Получен POST-запрос для добавления промокода:', req.body);

    // Валидация дат
    if (new Date(start_date) >= new Date(end_date)) {
        return res.status(400).json({ error: 'Дата начала должна быть раньше даты окончания' });
    }

    const query = `
        INSERT INTO promocodes (code, description, type, value, start_date, end_date, target_type, target_id, usage_limit, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(query, [code, description, type, value, start_date, end_date, target_type, target_id, usage_limit, status], (err, result) => {
        if (err) {
            console.error('Ошибка при добавлении промокода:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'Промокод с таким кодом уже существует' });
            }
            return res.status(500).json({ error: 'Ошибка при добавлении промокода' });
        }
        console.log('Промокод добавлен с ID:', result.insertId);
        res.json({ success: true, message: 'Промокод создан', id: result.insertId });
    });
});

// Редактирование промокода
app.put('/edit-promocode/:id', (req, res) => {
    const promocodeId = req.params.id;
    const { code, description, type, value, start_date, end_date, target_type, target_id, usage_limit, status } = req.body;

    console.log('Получен PUT-запрос для редактирования промокода с ID:', promocodeId, req.body);

    // Валидация дат
    if (new Date(start_date) >= new Date(end_date)) {
        return res.status(400).json({ error: 'Дата начала должна быть раньше даты окончания' });
    }

    const query = `
        UPDATE promocodes 
        SET code = ?, description = ?, type = ?, value = ?, start_date = ?, end_date = ?, 
            target_type = ?, target_id = ?, usage_limit = ?, status = ?
        WHERE id = ?
    `;

    db.query(query, [code, description, type, value, start_date, end_date, target_type, target_id, usage_limit, status, promocodeId], (err, result) => {
        if (err) {
            console.error('Ошибка при обновлении промокода:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'Промокод с таким кодом уже существует' });
            }
            return res.status(500).json({ error: 'Ошибка при обновлении промокода' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Промокод не найден' });
        }
        console.log('Промокод с ID обновлен:', promocodeId);
        res.json({ success: true, message: 'Промокод обновлен' });
    });
});

// Удаление промокода
app.delete('/delete-promocode/:id', (req, res) => {
    const promocodeId = req.params.id;

    console.log('Получен DELETE-запрос для удаления промокода с ID:', promocodeId);

    db.query('DELETE FROM promocodes WHERE id = ?', [promocodeId], (err, result) => {
        if (err) {
            console.error('Ошибка при удалении промокода:', err);
            return res.status(500).json({ error: 'Ошибка при удалении промокода' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Промокод не найден' });
        }
        console.log('Промокод с ID удален:', promocodeId);
        res.json({ success: true, message: 'Промокод удален' });
    });
});

// Обновление порядка товаров
app.post('/update-product-order', (req, res) => {
    const { products } = req.body;
    
    if (!products || !Array.isArray(products)) {
        return res.status(400).json({ error: 'Неверные данные' });
    }
    
    // Обновляем порядок для каждого товара
    const updatePromises = products.map(product => {
        return new Promise((resolve, reject) => {
            db.query('UPDATE items SET sort_order = ? WHERE id = ?', 
                [product.sort_order, product.id], (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
        });
    });
    
    Promise.all(updatePromises)
        .then(() => {
            res.json({ success: true, message: 'Порядок товаров обновлен' });
        })
        .catch(error => {
            console.error('Ошибка при обновлении порядка товаров:', error);
            res.status(500).json({ error: 'Ошибка при обновлении порядка товаров' });
        });
});

// Создание заказа
app.post('/create-order', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Не авторизован' });
    }

    const { items } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Некорректные данные заказа' });
    }

    // Начинаем транзакцию
    db.beginTransaction((err) => {
        if (err) {
            console.error('Ошибка при начале транзакции:', err);
            return res.status(500).json({ error: 'Ошибка сервера' });
        }

        // Вычисляем общую сумму заказа
        const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // Проверяем баланс пользователя
        db.query('SELECT balance FROM users WHERE id = ?', [req.user.id], (err, results) => {
            if (err) {
                return db.rollback(() => {
                    console.error('Ошибка при получении баланса:', err);
                    res.status(500).json({ error: 'Ошибка сервера' });
                });
            }

            if (results.length === 0) {
                return db.rollback(() => {
                    res.status(404).json({ error: 'Пользователь не найден' });
                });
            }

            const currentBalance = results[0].balance;

            if (currentBalance < totalAmount) {
                return db.rollback(() => {
                    res.status(400).json({ 
                        error: 'Недостаточно средств на балансе',
                        required: totalAmount,
                        available: currentBalance
                    });
                });
            }

            // Создаем заказ
            db.query(
                'INSERT INTO orders (user_id, total_amount, status) VALUES (?, ?, ?)',
                [req.user.id, totalAmount, 'completed'],
                (err, orderResult) => {
                    if (err) {
                        return db.rollback(() => {
                            console.error('Ошибка при создании заказа:', err);
                            res.status(500).json({ error: 'Ошибка при создании заказа' });
                        });
                    }

                    const orderId = orderResult.insertId;

                    // Добавляем товары в заказ
                    let completedItems = 0;
                    let hasError = false;

                    items.forEach((item, index) => {
                        db.query(
                            'INSERT INTO order_items (order_id, item_id, quantity, price) VALUES (?, ?, ?, ?)',
                            [orderId, item.item_id, item.quantity, item.price],
                            (err) => {
                                if (err) {
                                    hasError = true;
                                    console.error('Ошибка при добавлении товара в заказ:', err);
                                }

                                completedItems++;
                                
                                if (completedItems === items.length) {
                                    if (hasError) {
                                        return db.rollback(() => {
                                            res.status(500).json({ error: 'Ошибка при добавлении товаров в заказ' });
                                        });
                                    }

                                    // Списываем деньги с баланса
                                    const newBalance = currentBalance - totalAmount;
                                    db.query(
                                        'UPDATE users SET balance = ? WHERE id = ?',
                                        [newBalance, req.user.id],
                                        (err) => {
                                            if (err) {
                                                return db.rollback(() => {
                                                    console.error('Ошибка при обновлении баланса:', err);
                                                    res.status(500).json({ error: 'Ошибка при обновлении баланса' });
                                                });
                                            }

                                            // Подтверждаем транзакцию
                                            db.commit((err) => {
                                                if (err) {
                                                    return db.rollback(() => {
                                                        console.error('Ошибка при подтверждении транзакции:', err);
                                                        res.status(500).json({ error: 'Ошибка сервера' });
                                                    });
                                                }

                                                res.json({
                                                    success: true,
                                                    message: 'Заказ успешно создан',
                                                    orderId: orderId,
                                                    totalAmount: totalAmount,
                                                    newBalance: newBalance
                                                });
                                            });
                                        }
                                    );
                                }
                            }
                        );
                    });
                }
            );
        });
    });
});

// Получение истории заказов пользователя
app.get('/user-orders', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Не авторизован' });
    }

    const query = `
        SELECT 
            o.id,
            o.total_amount,
            o.status,
            o.created_at,
            GROUP_CONCAT(
                CONCAT(oi.quantity, 'x ', i.name, ' (', oi.price, '₽)')
                SEPARATOR ', '
            ) as items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN items i ON oi.item_id = i.id
        WHERE o.user_id = ?
        GROUP BY o.id
        ORDER BY o.created_at DESC
    `;

    db.query(query, [req.user.id], (err, results) => {
        if (err) {
            console.error('Ошибка при получении заказов:', err);
            return res.status(500).json({ error: 'Ошибка при получении заказов' });
        }

        res.json(results);
    });
});

// Проверка существования пользователя
app.post('/check-user', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Не авторизован' });
    }

    const { username } = req.body;
    
    if (!username) {
        return res.status(400).json({ error: 'Имя пользователя не указано' });
    }

    db.query(
        'SELECT id, username, balance FROM users WHERE username = ? AND id != ?',
        [username, req.user.id],
        (err, results) => {
            if (err) {
                console.error('Ошибка при поиске пользователя:', err);
                return res.status(500).json({ error: 'Ошибка сервера' });
            }

            if (results.length === 0) {
                return res.json({ success: false, error: 'Пользователь не найден' });
            }

            res.json({
                success: true,
                user: results[0]
            });
        }
    );
});

// Отправка перевода
app.post('/send-transfer', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Не авторизован' });
    }

    const { recipient_username, amount, message } = req.body;
    
    if (!recipient_username || !amount) {
        return res.status(400).json({ error: 'Некорректные данные перевода' });
    }

    if (amount < 10 || amount > 50000) {
        return res.status(400).json({ error: 'Сумма должна быть от 10 до 50,000 рублей' });
    }

    const commission = amount * 0.05;
    const totalAmount = amount + commission;

    // Начинаем транзакцию
    db.beginTransaction((err) => {
        if (err) {
            console.error('Ошибка при начале транзакции:', err);
            return res.status(500).json({ error: 'Ошибка сервера' });
        }

        // Находим получателя
        db.query(
            'SELECT id FROM users WHERE username = ? AND id != ?',
            [recipient_username, req.user.id],
            (err, recipientResults) => {
                if (err) {
                    return db.rollback(() => {
                        console.error('Ошибка при поиске получателя:', err);
                        res.status(500).json({ error: 'Ошибка сервера' });
                    });
                }

                if (recipientResults.length === 0) {
                    return db.rollback(() => {
                        res.status(404).json({ error: 'Получатель не найден' });
                    });
                }

                const recipientId = recipientResults[0].id;

                // Проверяем баланс отправителя
                db.query(
                    'SELECT balance FROM users WHERE id = ?',
                    [req.user.id],
                    (err, senderResults) => {
                        if (err) {
                            return db.rollback(() => {
                                console.error('Ошибка при получении баланса отправителя:', err);
                                res.status(500).json({ error: 'Ошибка сервера' });
                            });
                        }

                        if (senderResults.length === 0) {
                            return db.rollback(() => {
                                res.status(404).json({ error: 'Отправитель не найден' });
                            });
                        }

                        const currentBalance = senderResults[0].balance;

                        if (currentBalance < totalAmount) {
                            return db.rollback(() => {
                                res.status(400).json({ 
                                    error: 'Недостаточно средств на балансе',
                                    required: totalAmount,
                                    available: currentBalance
                                });
                            });
                        }

                        // Создаем запись о переводе
                        db.query(
                            'INSERT INTO transfers (sender_id, recipient_id, amount, commission, message) VALUES (?, ?, ?, ?, ?)',
                            [req.user.id, recipientId, amount, commission, message || null],
                            (err, transferResult) => {
                                if (err) {
                                    return db.rollback(() => {
                                        console.error('Ошибка при создании перевода:', err);
                                        res.status(500).json({ error: 'Ошибка при создании перевода' });
                                    });
                                }

                                // Списываем деньги с отправителя
                                const newSenderBalance = currentBalance - totalAmount;
                                db.query(
                                    'UPDATE users SET balance = ? WHERE id = ?',
                                    [newSenderBalance, req.user.id],
                                    (err) => {
                                        if (err) {
                                            return db.rollback(() => {
                                                console.error('Ошибка при списании с отправителя:', err);
                                                res.status(500).json({ error: 'Ошибка при списании средств' });
                                            });
                                        }

                                        // Добавляем деньги получателю
                                        db.query(
                                            'UPDATE users SET balance = balance + ? WHERE id = ?',
                                            [amount, recipientId],
                                            (err) => {
                                                if (err) {
                                                    return db.rollback(() => {
                                                        console.error('Ошибка при зачислении получателю:', err);
                                                        res.status(500).json({ error: 'Ошибка при зачислении средств' });
                                                    });
                                                }

                                                // Подтверждаем транзакцию
                                                db.commit((err) => {
                                                    if (err) {
                                                        return db.rollback(() => {
                                                            console.error('Ошибка при подтверждении транзакции:', err);
                                                            res.status(500).json({ error: 'Ошибка сервера' });
                                                        });
                                                    }

                                                    res.json({
                                                        success: true,
                                                        message: 'Перевод успешно отправлен',
                                                        transferId: transferResult.insertId,
                                                        newBalance: newSenderBalance
                                                    });
                                                });
                                            }
                                        );
                                    }
                                );
                            }
                        );
                    }
                );
            }
        );
    });
});

// История переводов
app.get('/transfer-history', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Не авторизован' });
    }

    const query = `
        SELECT 
            t.*,
            s.username as sender_username,
            r.username as recipient_username
        FROM transfers t
        LEFT JOIN users s ON t.sender_id = s.id
        LEFT JOIN users r ON t.recipient_id = r.id
        WHERE t.sender_id = ? OR t.recipient_id = ?
        ORDER BY t.created_at DESC
    `;

    db.query(query, [req.user.id, req.user.id], (err, results) => {
        if (err) {
            console.error('Ошибка при получении истории переводов:', err);
            return res.status(500).json({ error: 'Ошибка при получении истории переводов' });
        }

        res.json(results);
    });
});

// Сервер для обслуживания статических файлов (например, изображений)
app.use('/uploads', express.static('uploads'));

// Запуск сервера
app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});
