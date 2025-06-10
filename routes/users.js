const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../config/db');

// Middleware проверки администратора
const requireAdmin = (req, res, next) => {
  if (req.session.user?.role !== 'admin') {
    return res.status(403).send('Доступ запрещен');
  }
  next();
};

// Получение всех пользователей
router.get('/', async (req, res) => {
  try {
    const [users] = await pool.query('SELECT * FROM users');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера');
  }
});

// Создание пользователя
router.post('/', requireAdmin, async (req, res) => {
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
});

// Обновление пользователя (роль)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    await pool.query(
      'UPDATE users SET roll = ? WHERE ID = ?',
      [role, req.params.id]
    );
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера');
  }
});

// Удаление пользователя
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE ID = ?', [req.params.id]);
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера');
  }
});

module.exports = router;