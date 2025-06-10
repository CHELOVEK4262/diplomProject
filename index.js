const express = require('express');
const bcrypt = require('bcrypt');
const session = require('express-session');
const pool = require('./config/db'); // Подключаем пул

const userRoutes = require('./routes/users');
const trucksRouter = require('./routes/trucks');

const app = express();

app.use('/users', userRoutes);
app.use('/trucks', trucksRouter);

// Настройки приложения
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Настройка сессий
app.use(session({
    secret: "supersecretkey", // В продакшене используйте более сложный ключ
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false, // true, если используете HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 часа
    }
}));

// Middleware для проверки аутентификации
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/');
    }
    next();
};



// Главная страница (логин)
app.get('/', (req, res) => {
    if (req.session.user) {
        return res.redirect(req.session.user.role === 'admin' ? '/admin' : '/main');
    }
    res.render('login');
});

// Страница регистрации
app.get('/register', (req, res) => {
    res.render('register');
});

// Обработка регистрации
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
        await pool.query(
            'INSERT INTO users (email, login, password) VALUES (?, ?, ?)',
            [email, login, hashedPassword]
        );
        res.status(201).send('Пользователь успешно зарегистрирован');
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        res.status(500).send('Ошибка при регистрации пользователя');
    }
});

// Обработка входа
app.post('/login', async (req, res) => {
    const { login, password } = req.body;

    if (!login || !password) {
        return res.status(400).json({ message: "Все поля обязательны" });
    }

    try {
        const [users] = await pool.query(
            'SELECT * FROM users WHERE email = ? OR login = ?', 
            [login, login]
        );

        if (users.length === 0) {
            return res.status(400).json({ message: "Неправильный логин или пароль" });
        }

        const user = users[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(400).json({ message: "Неправильный логин или пароль" });
        }

        req.session.user = { 
            id: user.ID, 
            login: user.login, 
            role: user.roll || 'user' 
        };

        res.json({ 
            message: "Успешный вход", 
            redirectTo: user.roll === 'admin' ? '/admin' : '/main' 
        });
    } catch (err) {
        console.error('Ошибка входа:', err);
        res.status(500).json({ message: "Ошибка сервера" });
    }
});

// Выход
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Ошибка при выходе:', err);
            return res.status(500).send('Ошибка при выходе');
        }
        res.redirect('/');
    });
});

// Админ-панель
app.get('/admin', requireAuth, userRoutes, async (req, res) => {
    try {
        const [users, trucks, routes] = await Promise.all([
            getUsersFromDB(),
            getTrucksFromDB(),
            getRoutesFromDB()
        ]);
        
        res.render('admin', { 
            users, 
            trucks, 
            routes, 
            user: req.session.user,
            currentUserId: req.session.user.id
        });
    } catch (err) {
        console.error('Ошибка загрузки админ-панели:', err);
        res.status(500).send('Ошибка загрузки данных');
    }
});

// Главная страница пользователя
app.get('/main', requireAuth, async (req, res) => {
    try {
        const [trucks, routes, history] = await Promise.all([
            getTrucksFromDB(),
            getRoutesFromDB(),
            getHistoryFromDB()
        ]);
        
        res.render('index', { 
            trucks, 
            routes, 
            history, 
            user: req.session.user 
        });
    } catch (err) {
        console.error('Ошибка загрузки главной страницы:', err);
        res.status(500).send('Ошибка загрузки данных');
    }
});

app.get('/construct', requireAuth, async (req, res) => {
    try {
        const [routes] = await Promise.all([
            getRoutesFromDB()
        ]);
        
        res.render('routeConstructor', {
            routes,
            user: req.session.user 
        });
    } catch (err) {
        console.error('Ошибка загрузки главной страницы:', err);
        res.status(500).send('Ошибка загрузки данных');
    }
});

app.get('/statistic', requireAuth, async (req, res) => {
    try {
        const [users] = await Promise.all([
            getUsersFromDB()
        ]);
        const [trucks] = await Promise.all([
            getTrucksFromDB()
        ]);
        const [routes] = await Promise.all([
            getRoutesFromDB()
        ]);
        const [historys] = await Promise.all([
            getHistoryFromDB()
        ]);
        
        res.render('statistic', {
            users,
            trucks,
            routes,
            historys,
            user: req.session.user 
        });
    } catch (err) {
        console.error('Ошибка загрузки главной страницы:', err);
        res.status(500).send('Ошибка загрузки данных');
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/');
        }
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});

// API для работы с пользователями
app.route('/admin/users/:id?')
    .post(userRoutes, async (req, res) => {
        try {
            const { email, login, password, role } = req.body;
            const hashedPassword = await bcrypt.hash(password, 10);
            
            await pool.query(
                'INSERT INTO users (email, login, password, roll) VALUES (?, ?, ?, ?)',
                [email, login, hashedPassword, role]
            );
            res.sendStatus(201);
        } catch (err) {
            console.error(err);
            res.status(500).send('Ошибка сервера');
        }
    })
    .put(userRoutes, async (req, res) => {
        try {
            const { role } = req.body;
            await pool.query(
                'UPDATE users SET roll = ? WHERE id = ?', 
                [role, req.params.id]
            );
            res.sendStatus(200);
        } catch (err) {
            console.error(err);
            res.status(500).send('Ошибка сервера');
        }
    })
    .delete(userRoutes, async (req, res) => {
        try {
            await pool.query('DELETE FROM users WHERE ID = ?', [req.params.id]);
            res.sendStatus(200);
        } catch (err) {
            console.error(err);
            res.status(500).send('Ошибка сервера');
        }
    });

// API для работы с автомобилями
app.route('/admin/trucks/:id?')
    .post(userRoutes, async (req, res) => {
        try {
            const { name, regNumber, fuelUsage } = req.body;
            await pool.query(
                'INSERT INTO trucks (TruckName, TruckRegNumber, TruckFuelUsage) VALUES (?, ?, ?)',
                [name, regNumber, fuelUsage]
            );
            res.sendStatus(201);
        } catch (err) {
            console.error(err);
            res.status(500).send('Ошибка сервера');
        }
    })
    .put(userRoutes, async (req, res) => {
        try {
            const { name, regNumber, fuelUsage } = req.body;
            await pool.query(
                'UPDATE trucks SET TruckName = ?, TruckRegNumber = ?, TruckFuelUsage = ? WHERE TruckID = ?',
                [name, regNumber, fuelUsage, req.params.id]
            );
            res.sendStatus(200);
        } catch (err) {
            console.error(err);
            res.status(500).send('Ошибка сервера');
        }
    })
    .delete(userRoutes, async (req, res) => {
        try {
            await pool.query('DELETE FROM trucks WHERE TruckID = ?', [req.params.id]);
            res.sendStatus(200);
        } catch (err) {
            console.error(err);
            res.status(500).send('Ошибка сервера');
        }
    });

// API для работы с маршрутами
app.route('/admin/routes/:id?')
    .post(userRoutes, async (req, res) => {
        try {
            const { startLocation, endLocation } = req.body;
            await pool.query(
                'INSERT INTO routes (StartLocation, EndLocation) VALUES (?, ?)',
                [startLocation, endLocation]
            );
            res.sendStatus(201);
        } catch (err) {
            console.error(err);
            res.status(500).send('Ошибка сервера');
        }
    })
    .put(userRoutes, async (req, res) => {
        try {
            const { startLocation, endLocation } = req.body;
            await pool.query(
                'UPDATE routes SET StartLocation = ?, EndLocation = ? WHERE RouteID = ?',
                [startLocation, endLocation, req.params.id]
            );
            res.sendStatus(200);
        } catch (err) {
            console.error(err);
            res.status(500).send('Ошибка сервера');
        }
    })
    .delete(userRoutes, async (req, res) => {
        try {
            await pool.query('DELETE FROM routes WHERE RouteID = ?', [req.params.id]);
            res.sendStatus(200);
        } catch (err) {
            console.error(err);
            res.status(500).send('Ошибка сервера');
        }
    });


// Вспомогательные функции для работы с БД
async function getTrucksFromDB() {
    const [rows] = await pool.query('SELECT * FROM trucks');
    return rows;
}

async function getRoutesFromDB() {
  // Получаем маршруты с точками через LEFT JOIN
  const [rows] = await pool.query(`
    SELECT 
      r.RouteID, r.StartLocation, r.EndLocation, 
      ip.pointName, ip.indexNum
    FROM routes r
    LEFT JOIN IntermediatePoints ip ON r.RouteID = ip.routeID
    ORDER BY r.RouteID, ip.indexNum
  `);

  // Группируем данные по маршрутам
  const routesMap = new Map();

  for (const row of rows) {
    if (!routesMap.has(row.RouteID)) {
      routesMap.set(row.RouteID, {
        RouteID: row.RouteID,
        StartLocation: row.StartLocation,
        EndLocation: row.EndLocation,
        IntermediatePoints: []
      });
    }
    if (row.pointName) {
      routesMap.get(row.RouteID).IntermediatePoints.push(row.pointName);
    }
  }

  // Возвращаем массив объектов маршрутов, где IntermediatePoints — массив строк (названия точек)
  return Array.from(routesMap.values());
}

async function getHistoryFromDB() {
    const [rows] = await pool.query('SELECT * FROM history');
    return rows;
}

async function getUsersFromDB() {
    const [rows] = await pool.query('SELECT * FROM users');
    return rows;
}

// Сохранение полного маршрута с промежуточными точками
app.post('/routes/saveFull', requireAuth, async (req, res) => {
    const { startLocation, endLocation, intermediatePoints } = req.body;

    if (!startLocation || !endLocation) {
        return res.status(400).send('Старт и финиш обязательны');
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Вставляем основной маршрут
        const [routeResult] = await conn.query(
            'INSERT INTO routes (StartLocation, EndLocation) VALUES (?, ?)',
            [startLocation, endLocation]
        );
        const routeID = routeResult.insertId;

        // 2. Вставляем промежуточные точки (если есть)
        if (intermediatePoints && intermediatePoints.length > 0) {
            const values = intermediatePoints.map((point, index) => [routeID, index, point]);
            await conn.query(
                'INSERT INTO IntermediatePoints (routeID, indexNum, pointName) VALUES ?',
                [values]
            );
        }

        await conn.commit();
        res.status(201).json({ message: 'Маршрут успешно сохранён', routeID });
    } catch (err) {
        await conn.rollback();
        console.error('Ошибка сохранения маршрута:', err);
        res.status(500).send('Ошибка при сохранении маршрута');
    } finally {
        conn.release();
    }
});

app.put('/routes/update/:RouteID', requireAuth, async (req, res) => {
  const routeID = req.params.RouteID;
  const { startLocation, endLocation, intermediatePoints } = req.body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Обновляем основные данные маршрута
    await conn.query(
      'UPDATE routes SET StartLocation = ?, EndLocation = ? WHERE RouteID = ?',
      [startLocation, endLocation, routeID]
    );

    // Удаляем старые промежуточные точки для данного маршрута
    await conn.query(
      'DELETE FROM IntermediatePoints WHERE routeID = ?',
      [routeID]
    );

    // Вставляем новые промежуточные точки, если они есть
    if (intermediatePoints && intermediatePoints.length > 0) {
      const values = intermediatePoints.map((point, index) => [routeID, index, point]);
      await conn.query(
        'INSERT INTO IntermediatePoints (routeID, indexNum, pointName) VALUES ?',
        [values]
      );
    }

    await conn.commit();
    res.json({ message: 'Маршрут успешно обновлен' });
  } catch (err) {
    await conn.rollback();
    console.error('Ошибка обновления маршрута:', err);
    res.status(500).json({ message: 'Ошибка при обновлении маршрута' });
  } finally {
    conn.release();
  }
});

// Запуск сервера
const PORT = 3000;
const HOST = 'localhost';

app.listen(PORT, () => {
    console.log(`Сервер запущен: http://${HOST}:${PORT}`);
});