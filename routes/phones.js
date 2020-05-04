const { Router } = require('express')
const Phone = require('../models/Phone')
const { call } = require('../helpers/caller')
const { url } = require('../helpers/network')
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

router.get('/test', (req, res) => {
    res.send('shopa!!!!')
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
    let status = req.body.CallStatus
    emitter.emit(status)
    res.status(204).send()
})

router.get('/emitter', async (req, res) => {
    console.log('emitter get')
    res.status(204).send();
})

router.get('/registration', async (req, res) => {
    const phone = await Phone.findById(req.query.id)

    if (!phone) {
        res.redirect('/')
        return
    }
    let sid = '555'// await call(phone.number).then(res => res.sid)

    res.render('registration', {
        title: 'registration',
        number: phone.number,
        sid: sid,
        status: 'hueva',
    })
})

module.exports = router