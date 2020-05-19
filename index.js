const express = require('express')
const mongoose = require('mongoose')
const exphbs = require('express-handlebars')
const path = require('path')
const phoneRoutes = require('./routes/phones')
const ngrok = require('ngrok')
const { config } = require('./helpers/utils')
const os = require('os')

const HOST = os.networkInterfaces()['Беспроводная сеть'][1].address || 'localhost'
const PORT = process.env.PORT || 3000

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
            config().mongodb, {
            useNewUrlParser: true,
            useFindAndModify: false,
            useUnifiedTopology: true
        })
        const url = await ngrok.connect(PORT)
        app.listen(PORT, () => {
            console.log(`server starts listening on ${HOST}:${PORT}`)
        })
        console.log('public url: ', url)
        config(url)
    } catch (e) {
        console.log(e)
    }
}

start()