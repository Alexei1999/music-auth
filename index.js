const express = require('express')
const mongoose = require('mongoose')
const path = require('path')
const exphbs = require('express-handlebars')
const phoneRoutes = require('./routes/phones')
var os = require('os');

//const HOST = os.networkInterfaces()['Беспроводная сеть'][1].address;
const PORT = 3000 //process.env.PORT || 3000

const app = express()
const hbs = exphbs.create({
    defaultLayout: 'main',
    extname: 'hbs'
})

app.engine('hbs', hbs.engine)
app.set('view engine', 'hbs')
app.set('views', 'views')

app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))
app.use(phoneRoutes)

async function start() {
    try {
        await mongoose.connect(
            '', {
            useNewUrlParser: true,
            useFindAndModify: false,
            useUnifiedTopology: true
        })
        app.listen(PORT, () => {
            console.log('server starts listening on ', PORT)//`${HOST}:${PORT}`)
        })
    } catch (e) {
        console.log(e)
    }
}


start()
