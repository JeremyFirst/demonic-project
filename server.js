require('dotenv').config();  // Загружаем переменные из .env
const express = require('express');  // Подключаем Express
const app = express();  // Инициализируем объект app
const session = require('express-session');  // Подключаем сессии
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
    if (req.headers.referer) {
        req.session.returnTo = req.headers.referer;  // Запоминаем, откуда ушел игрок
    }
    passport.authenticate('steam')(req, res, next);
});

// После авторизации вернуть игрока на предыдущую страницу
app.get('/auth/steam/return',
    passport.authenticate('steam', { failureRedirect: '/' }),
    (req, res) => {
        const returnTo = req.session.returnTo || '/profile.html';
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

    db.query('SELECT * FROM admins WHERE username = ?', [login], (err, results) => {
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

            console.log('Ответ с сервером: ', { username: user.username, role: user.role }); // Логирование ответа
    
            return res.status(200).json({ message: 'Успешная авторизация', username: user.username, role: user.role });
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



// Сервер для обслуживания статических файлов (например, изображений)
app.use('/uploads', express.static('uploads'));

// Запуск сервера
app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});
