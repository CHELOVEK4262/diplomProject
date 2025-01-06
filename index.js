const express = require('express')
const mysql = require('mysql2')

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password:"09122005Ab",
    database: 'transpcalc'
})

const app = express()

app.set('view engine', 'ejs')
app.use(express.static('public'))
app.use(express.json())

app.get('/', (req, res) => {
    // Используем Promise.all для параллельного выполнения запросов
    Promise.all([getTrucksFromDB(), getRoutesFromDB()])
        .then(([trucks, routes]) => {
            res.render('index', { trucks, routes });
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