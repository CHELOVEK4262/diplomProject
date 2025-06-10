const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Middleware проверки администратора (если нужно)
const requireAdmin = (req, res, next) => {
  if (req.session.user?.role !== 'admin') {
    return res.status(403).send('Доступ запрещен');
  }
  next();
};

// Получение всех грузовиков
router.get('/', async (req, res) => {
  try {
    const [trucks] = await pool.query('SELECT * FROM trucks');
    res.json(trucks);
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера');
  }
});

// Создание грузовика
router.post('/', requireAdmin, async (req, res) => {
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
});

// Обновление грузовика
router.put('/:id', requireAdmin, async (req, res) => {
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
});

// Удаление грузовика
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM trucks WHERE TruckID = ?', [req.params.id]);
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера');
  }
});

module.exports = router;