const { Router } = require('express')
const Phone = require('../models/Phone')
const { call } = require('../helpers/caller')
const { validationNumber, emitter } = require('../helpers/utils')

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
        number: req.body.title,
        active: true
    })

    await phone.save()
    res.redirect('/')
})

router.post('/complete', async (req, res) => {
    const phone = await Phone.findById(req.body.id)

    if (!phone.confirmed) {
        res.redirect('/registration/?id=' + req.body.id)
        return
    }

    phone.active = !!req.body.active
    await phone.save()
    res.redirect('/')
})

router.post('/emitter', async (req, res) => {
    console.log(req.body)
    let status = req.body.CallStatus
    let caller = req.body.Caller

    emitter.emit('status', status, caller)
    res.status(204).send()
})

router.get('/emitter', async (req, res) => {
    let id = 0

    res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache'
    })

    emitter.on('status', (status, caller) => {
        res.write(`event: ${status}\ndata: ${caller}\nid: ${id++}\n\n`)
    })
})

router.get('/registration', async (req, res) => {
    const phone = await Phone.findById(req.query.id)

    if (!phone) {
        res.redirect('/')
        return
    }
    let sid = await call(phone.number).then(res => res.sid)

    res.render('registration', {
        title: 'registration',
        number: phone.number,
        sid: sid,
    })
})

module.exports = router