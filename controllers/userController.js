const bcrypt = require('bcrypt');
const pool = require('../config/db');

const registerUser = async (req, res) => {
    const { email, login, password, confirmPassword } = req.body;
    if (!email || !login || !password || !confirmPassword) {
        return res.status(400).send('Все поля обязательны');
    }
    if (password !== confirmPassword) {
        return res.status(400).send('Пароли не совпадают');
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query('INSERT INTO users (email, login, password) VALUES (?, ?, ?)', [email, login, hashedPassword]);
        res.status(201).send('Пользователь успешно зарегистрирован');
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        res.status(500).send('Ошибка при регистрации');
    }
};

const loginUser = async (req, res) => {
    const { login, password } = req.body;
    if (!login || !password) return res.status(400).json({ message: "Все поля обязательны" });

    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ? OR login = ?', [login, login]);
        if (users.length === 0) return res.status(400).json({ message: "Неправильный логин или пароль" });

        const user = users[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return res.status(400).json({ message: "Неправильный логин или пароль" });

        req.session.user = { id: user.ID, login: user.login, role: user.roll || 'user' };
        res.json({ message: "Успешный вход", redirectTo: user.roll === 'admin' ? '/admin' : '/main' });

    } catch (err) {
        console.error('Ошибка входа:', err);
        res.status(500).json({ message: "Ошибка сервера" });
    }
};

module.exports = {
    registerUser,
    loginUser
};