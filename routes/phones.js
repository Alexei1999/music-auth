const multer = require('multer')
const got = require('got');
const FormData = require('form-data')
const { Router } = require('express')
const { call } = require('../helpers/caller')
const { validationNumber, emitter, config } = require('../helpers/utils')
const Phone = require('../models/Phone')
const Registration = require('../models/Registration')
const Song = require('../models/Song')
const path = require('path')
const fs = require('fs')

const upload = multer({ dest: path.resolve(__dirname, '../public/uplods/') })
const router = Router()

router.get('/', async (req, res) => {
    const phones = await Phone.find({}).lean()

    res.render('index', {
        title: 'Numbers list',
        isIndex: true,
        phones
    })
})

router.get('/create', (req, res) => {
    res.render('create', {
        title: 'Create number',
        isCreate: true
    })
})

router.post('/create', async (req, res) => {
    const number = req.body.title

    // if (!validationNumber(number))//todo validationNumber
    //     res.redirect('/create')

    const phone = new Phone({
        number: number,
        active: true
    })

    await phone.save()
    res.redirect('/')
})

router.post('/complete', async (req, res) => {
    const phone = await Phone.findById(req.body.id)

    if (!phone.confirmed) {
        res.redirect('/registration/?number=' + phone.number)
        return
    }

    phone.active = !!req.body.active
    await phone.save()
    res.redirect('/')
})

router.post('/emitter', async (req, res) => {
    let status = req.body.CallStatus
    let called = req.body.Called

    emitter.emit('status', status, called)
    res.status(204).send()
})

router.get('/emitter', async (req, res) => {
    let id = 0

    res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
    })

    setTimeout(() => res.write(`event: ringing\ndata: +number\nid: ${id++}\n\n`), 500)
    setTimeout(() => res.write(`event: in-progress\ndata: +number\nid: ${id++}\n\n`), 1000)
    setTimeout(() => res.write(`event: completed\ndata: +number\nid: ${id++}\n\n`), 10000)

    // emitter.on('status', (status, called) => {
    //     res.write(`event: ${status}\ndata: ${called}\nid: ${id++}\n\n`)
    // })
})

router.get('/registration', async (req, res) => {
    const phone = await Phone.find({ number: req.query.number })

    if (!phone) {
        res.redirect('/?error=PDONCONFIRMED')
        return
    }
    //call(phone.number, song)

    res.render('registration', {
        title: 'registration',
        number: phone.number
    })
})


router.get('/verification', async (req, res) => {
    let reg = req.body.regId

    if (reg) {
        reg = Registration.findById(reg)
        res.send({
            confirmed: reg.confirmed,
            pending: reg.pending,
            error: reg.error
        })
        return
    }

    if (req.body.userId)
        return

    const userId = req.body.userId

    let n = Song.count(query);
    let r = Math.floor(Math.random() * n);
    const song = Song.find({}).limit(1).skip(r)

    reg = new Registration({
        userId: userId,
        songId: song._id,
        pending: true
    })
    reg.save()

    res.send(song._id)
})

router.post('/verification', upload.single('file'), async (req, res) => {
    let number = req.body.number
    let Path = req.file.path
    console.log(number)
    console.log(Path)

    var fd = new FormData()
    fd.append('file', fs.createReadStream(Path))
    fd.append('return', 'timecode,apple_music,deezer,spotify')
    fd.append('api_token', config().audD)

    let audio = await got('https://api.audd.io/',
        {
            method: 'post',
            body: fd
        }
    ).then(raw => JSON.stringify(raw.body))

    fs.unlink(Path)
    console.log(audio)

    res.sendStatus(204);
})

module.exports = router