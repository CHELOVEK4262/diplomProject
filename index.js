const express = require('express')
const mysql = require('mysql2')

const app = express()

app.set('view engine', 'ejs')
app.use(express.static('public'))

app.get('/', (req, res) => {
     res.render('index')
})

const PORT = 3000;

app.listen(3000, () => {
    console.log(`Server started:\nhttp://localhost:${PORT}`)
})