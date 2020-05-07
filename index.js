const express = require('express')
const mongoose = require('mongoose')
const path = require('path')
const exphbs = require('express-handlebars')
const phoneRoutes = require('./routes/phones')
const ngrok = require('ngrok')
const { config } = require('./helpers/utils')

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
            config().mongodb, {
            useNewUrlParser: true,
            useFindAndModify: false,
            useUnifiedTopology: true
        })
        app.listen(PORT, () => {
            console.log('server starts listening on ', PORT)//`${HOST}:${PORT}`)
        })
        const url = 'http://3c3d4b79.ngrok.io' //= await ngrok.connect(PORT)
        console.log('public url: ', url)
        config(url)
    } catch (e) {
        console.log(e)
    }
}


start()
