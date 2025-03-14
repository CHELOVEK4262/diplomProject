const express = require('express')
const mysql = require('mysql2')
const bcrypt = require('bcrypt');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password:"09122005Ab",
    database: 'transpcalc'
})

const session = require('express-session');



const app = express()

app.set('view engine', 'ejs')
app.use(express.static('public'))
app.use(express.json())


app.get('/', (req, res) => {
    Promise.all([getUsersFromDB()])
        .then(([users]) => {
            res.render('login', { users });
        })
        .catch(err => {
            console.error('Error fetching data from database:', err);
            res.status(500).send('Error fetching data');
        });
});

app.use(session({
    secret: "supersecretkey",  // Используйте сложный секретный ключ
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }  // Убедитесь, что secure=false, если используете http
}));


app.get('/register', (req, res) => {
    Promise.all([getUsersFromDB()])
        .then(([users]) => {
            res.render('register', { users });
        })
        .catch(err => {
            console.error('Error fetching data from database:', err);
            res.status(500).send('Error fetching data');
        });
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', async (req, res) => {
    const { email, login, password, confirmPassword } = req.body;

    if (!email || !login || !password || !confirmPassword) {
        return res.status(400).send('Все поля обязательны для заполнения');
    }

    if (password !== confirmPassword) {
        return res.status(400).send('Пароли не совпадают');
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const query = 'INSERT INTO users (email, login, password) VALUES (?, ?, ?)';
        pool.query(query, [email, login, hashedPassword], (err, results) => {
            if (err) {
                console.error('Error inserting user:', err);
                return res.status(500).send('Error registering user');
            }
            res.status(201).send('Пользователь успешно зарегистрирован');
        });
    } catch (error) {
        console.error('Error hashing password:', error);
        res.status(500).send('Error processing request');
    }
});

app.post('/login', (req, res) => {
    const { login, password } = req.body;

    if (!login || !password) {
        return res.status(400).json({ message: "Все поля обязательны" });
    }

    const query = 'SELECT * FROM users WHERE email = ? OR login = ?';
    pool.query(query, [login, login], async (err, results) => {
        if (err) {
            console.error('Ошибка при поиске пользователя:', err);
            return res.status(500).json({ message: "Ошибка сервера" });
        }

        if (results.length === 0) {
            return res.status(400).json({ message: "Неправильный логин или пароль" });
        }

        const user = results[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(400).json({ message: "Неправильный логин или пароль" });
        }

        // Сохраняем информацию о пользователе в сессии
        req.session.user = { id: user.id, login: user.login, role: user.roll }; // Добавляем роль пользователя

        // Если у пользователя роль admin, перенаправляем на страницу админа
        if (user.roll === 'admin') {
            return res.json({ message: "Успешный вход", redirectTo: '/admin' });
        }

        // В противном случае перенаправляем на главную страницу
        res.json({ message: "Успешный вход", redirectTo: '/main' });
    });
});



app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Ошибка при выходе');
        }
        res.redirect('/');
    });
});


app.get('/admin', (req, res) => {
    if (!req.session.user) {
        return res.status(403).send('Доступ запрещен. Войдите в систему.');
    }

    const query = 'SELECT roll FROM users WHERE id = ?';
    pool.query(query, [req.session.user.id], (err, results) => {
        
        if (err) {
            console.error('Ошибка при получении роли пользователя:', err);
            return res.status(500).send('Ошибка сервера');
        }

        // if (results.length === 0 || results[0].roll !== 'admin') {
        //     return res.status(403).send('Доступ запрещен. Вы не администратор.');
        // }

        res.render('admin'); // Рендерим страницу администратора
    });
});



app.get('/main', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/'); // Перенаправление на страницу входа, если нет сессии
    }

    // Используем Promise.all для параллельного выполнения запросов
    Promise.all([getTrucksFromDB(), getRoutesFromDB(), getHistoryFromDB()])
        .then(([trucks, routes, history]) => {
            const user = req.session.user; // Получаем информацию о пользователе из сессии
            res.render('index', { trucks, routes, history, user }); // Передаем данные пользователя в шаблон
        })
        .catch(err => {
            console.error('Error fetching data from database:', err);
            res.status(500).send('Error fetching data');
        });
});


app.get('/main', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/'); // Перенаправляем на страницу входа, если нет сессии
    }

    // Данные пользователя из сессии
    const user = req.session.user;

    // Параллельно загружаем данные
    Promise.all([getTrucksFromDB(), getRoutesFromDB(), getHistoryFromDB()])
        .then(([trucks, routes, history]) => {
            res.render('index', { trucks, routes, history, user }); // Передаем данные пользователя в шаблон
        })
        .catch(err => {
            console.error('Error fetching data from database:', err);
            res.status(500).send('Error fetching data');
        });
});



const PORT = 3000;
const HOST = 'localhost';

app.listen(PORT, () => {
    console.log(`Server started:\nhttp://${HOST}:${PORT}`)
})

function getTrucksFromDB() {
    const query = 'SELECT * FROM trucks';
    return new Promise((resolve, reject) => {
        pool.query(query, (err, results) => {
            if (err) {
                return reject(err);
            }
            resolve(results);
        });
    });
}

function getRoutesFromDB() {
    const query = 'SELECT * FROM routes';
    return new Promise((resolve, reject) => {
        pool.query(query, (err, results) => {
            if (err) {
                return reject(err);
            }
            resolve(results);
        });
    });
}

function getHistoryFromDB() {
    const query = 'SELECT * FROM history';
    return new Promise((resolve, reject) => {
        pool.query(query, (err, results) => {
            if (err) {
                return reject(err);
            }
            resolve(results);
        });
    });
}

function getUsersFromDB()
{
    const query = 'SELECT * FROM users';
    return new Promise((resolve, reject) => {
        pool.query(query, (err, results) => {
            if (err) {
                return reject(err);
            }
            resolve(results);
        });
    });
}

app.post('/delete-route', (req, res) => {
    const { StartLocation, EndLocation } = req.body;
    if (!StartLocation || !EndLocation) {
        return res.status(400).send('Loading and unloading points are required');
    }

    deleteRouteFromDB(StartLocation, EndLocation)
        .then(() => res.sendStatus(200))
        .catch(err => {
            console.error('Error deleting route:', err);
            res.status(500).send('Error deleting route');
        });
});

function deleteRouteFromDB(StartLocation, EndLocation) {
    const query = 'DELETE FROM routes WHERE StartLocation = ? AND EndLocation = ?';
    return new Promise((resolve, reject) => {
        pool.query(query, [StartLocation, EndLocation], (err) => {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
}