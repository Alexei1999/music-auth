const multer = require('multer')
const got = require('got');
const FormData = require('form-data')
const { Router } = require('express')
const { call } = require('../helpers/caller')
const { config, comparer, errors } = require('../helpers/utils')
const EventEmitter = require('events')
const Phone = require('../models/Phone')
const Registration = require('../models/Registration')
const Song = require('../models/Song')
const path = require('path')
const fs = require('fs')

const upload = multer({ dest: path.resolve(__dirname, '../public/uplods/') })
const router = Router()

let client = new EventEmitter()
let emitter = new EventEmitter()
let calls = {}

let controller = async () => {
    let regs = await Registration.find({})

    regs.forEach(reg => {
        if (reg.pending == true && Date.now() - reg.date > 60000) {
            Phone.findById(reg.userId).then(phone => {
                abort(reg._id, phone.number, 'RGTIMEDOUT')
            }).catch(e => { throw new Error('database access error to phone user id' + reg.userId) })
        }
    })
    setTimeout(controller, 10000)
}
controller()

const emit = (...theArgs) => {
    try {
        emitter.emit(...theArgs)
        client.emit(theArgs[0], ...theArgs.slice(2))
    } catch (e) {
        setTimeout(() => emit(...theArgs), 1000)
    }
}

const getButtons = (phones, registrations) => {
    return phones.map(phn => {
        let reg = registrations[phn._id]
        let res = {
            number: phn.number,
            active: phn.active,
            pending: reg ? reg.pending : false,
            error: reg ? reg.error : false,
            confirmed: reg ? reg.confirmed : false
        }
        if (reg && reg.error) {
            Registration
                .findById(phn.registr)
                .then(reg => { reg.error = false; return reg })
                .then(reg => reg.save())
                .catch(e => console.log(e))
        }
        return res
    })
}

emitter.on('error', async number => {
    let phone = await Phone.findOne({ number: number }).catch(e => { throw new Error('database access error to phone ' + number) })
    let regId = phone.regId || await Registration.findOne({ userId: phone._id }).catch(e => { throw new Error('database access error to registration ' + phone._id) })
    if (regId)
        try {
            await Registration.findById(regId)
                .then(reg => { reg.error = true; reg.pending = false; return reg })
                .then(reg => reg.save())
        } catch (e) {
            console.log(e)
        }
})

router.get('/', async (req, res) => {
    notify = errors(req.query.error)

    const phones = await Phone.find({}).lean()
    const registrations = {};

    (await Registration.find({}))
        .forEach(reg => registrations[reg.userId] = reg)

    let buttons = getButtons(phones, registrations)

    res.render('index', {
        title: 'Numbers list',
        isIndex: true,
        notify,
        buttons
    })
})

router.post('/delete', async (req, res) => {
    const number = req.body.number
    let phone = await Phone.findOne({ number: number }).catch(e => { throw new Error('database access error to phone ' + number) })

    if (!phone)
        return res.redirect('/?error=WRNUMBER')

    await Phone.findByIdAndDelete(phone._id)
    await Registration.findOneAndDelete({ userId: phone._id })

    res.redirect('/')
})

router.get('/create', (req, res) => {
    notify = errors(req.query.error)
    res.render('create', {
        title: 'Create number',
        isCreate: true,
        notify
    })
})

router.post('/create', async (req, res) => {
    const number = req.body.title

    if (!number.match(/^\+\d*$/))
        return res.redirect('/create/?error=WRNUMBER')

    let phone = await Phone.findOne({ number: number }).catch(e => { throw new Error('database access error to phone ' + number) })

    if (phone)
        return res.redirect('/create/?error=ALREXIST')

    phone = new Phone({
        number: number,
        active: true
    })

    await phone.save()
    res.redirect('/')
})

router.post('/complete', async (req, res) => {
    let phone
    try {
        phone = await Phone.findOne({ number: req.body.number }).catch(e => { throw new Error('database access error to phone ' + number) })
        registr = await Registration.findById(phone.registr).catch(e => { throw new Error('database access error to registration ' + phone.registr) })
    } catch (e) {
        return res.redirect('/?error=WRNUMBER')
    }

    if (!registr || !registr.confirmed)
        return res.redirect('/registration/?number=' + phone.number)

    phone.active = !!req.body.active
    await phone.save()
    res.redirect('/')
})

router.post('/emitter', async (req, res) => {
    let status = req.body.CallStatus
    let called = req.body.Called

    emit('status', 'status', status, called)
    res.status(204).send()
})

router.get('/reload', async (req, res) => {
    let id = 0
    client = new EventEmitter()

    res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
    })

    client.on('change', () => res.write(`event: change\ndata: reload\nid: ${id++}\n\n`))
    client.on('error', msg => res.write(`event: error\ndata: ${msg}\nid: ${id++}\n\n`))
})

router.get('/emitter', async (req, res) => {
    client = new EventEmitter()
    let id = 0

    res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
    })

    client.on('status', (status, called) => {
        res.write(`event: ${status}\ndata: ${called}\nid: ${id++}\n\n`)
        if (status == 'completed') res.sendStatus(204)
    })
    client.on('error', () => {
        res.write(`event: error\ndata: error\nid: ${id++}\n\n`)
        res.sendStatus(204)
    })
})

router.get('/registration', async (req, res) => {
    let phone
    try {
        phone = await Phone.findOne({ number: `+${req.query.number.slice(1)}` }).catch(e => { throw new Error('database access error to phone ' + number) })
    } catch (e) {
        return res.redirect('/?error=WRNUMBER')
    }
    let data
    try {
        data = await got(`${config().url}/verification/?userId=${phone._id}`)
            .then(data => JSON.parse(data.body))
    } catch (e) {
        emitter.emit('error', phone.number)
        return res.redirect(`/?error=SRDONAVALIBLE`)
    }
    delete calls[phone.number]
    const song = await Song.findById(data.songId)
    call(phone.number, song.url).catch(e => {
        Registration.findOne({ userId: phone._id }).then(reg => abort(reg._id, 'WRNUMBER'))
    })


    res.render('registration', {
        title: 'registration',
        number: phone.number,
        sid: config().sid
    })
})

router.get('/verification', async (req, res) => {
    let phone = await Phone.findById(req.query.userId).catch(e => { throw new Error('database access error to phone ' + req.query.userId) })

    try {
        await Registration.findByIdAndRemove(phone.registr).catch(e => { throw new Error('database access error to registration ' + phone.registr) })
    } catch (e) {
        if (phone)
            emit('error', phone.number, 'WRID')
        return res.sendStatus(204)
    }
    let n = await Song.count({})
    let r = Math.floor(Math.random() * n)
    const song = await Song.find({}).limit(1).skip(r).then(data => data.pop())

    let reg = new Registration({
        userId: phone._id,
        songId: song._id,
        date: Date.now(),
        pending: true
    })
    await reg.save()

    phone.registr = reg._id
    await phone.save()

    res.send(JSON.stringify({ songId: song._id }))
})

async function abort(id, number, error) {
    try {
        await Registration
            .findById(id)
            .then(reg => {
                reg.pending = false
                reg.error = true
                return reg
            })
            .then(reg => reg.save())
    } catch (e) {
        console.log('no registration error')
        return;
    }
    emit('error', number, error)
}

router.post('/verification', upload.single('file'), async (req, res) => {
    console.log('verification')
    let phone = await Phone.findOne({ number: req.body.number }).catch(e => { throw new Error('database access error to phone ' + req.body.number) })
    let reg = await Registration.findById(phone.registr).catch(e => { throw new Error('database access error to registration ' + phone.registr) })
    let Path = req.file.path

    if (reg.pending == false) return res.sendStatus(204)

    var fd = new FormData()
    try {
        fd.append('file', fs.createReadStream(Path))
        fd.append('return', 'timecode')
        fd.append('api_token', config().audD)
    } catch (e) {
        await abort(reg._id, phone.number, 'FSDONAVALIBLE')
        return res.sendStatus(204)
    }

    let audio, song
    try {
        let reqAud = got('https://api.audd.io/',
            {
                method: 'post',
                body: fd
            }
        ).then(raw => {
            fs.unlink(Path, err => { if (err) console.log(err) })
            return JSON.parse(raw.body)
        })
        let reqSong = Song.findById(reg.songId);
        [audio, song] = await Promise.all([reqAud, reqSong]);
    } catch (e) {
        await abort(reg._id, phone.number, 'WRREQUEST')
        return res.sendStatus(204)
    }
    console.group('target song')
    console.log(song)
    console.groupEnd()

    console.group('recognized audio')
    console.log(audio)
    console.groupEnd()

    reg.pending = false
    await reg.save()
    emit('change')

    if (audio.status != 'success' || audio.result == null) {
        reg.error = true
        await reg.save()
        emit('change')
        await abort(reg._id, phone.number, 'REGFAILED')
        return res.sendStatus(204)
    }
    else audio = audio.result

    console.log('compare result: ', comparer(audio, song))

    if (comparer(audio, song)) reg.confirmed = true
    else reg.error = true

    await reg.save()
    emit('change')

    res.sendStatus(204)
})

emitter.on('status', async (_, status, called) => {
    if (status == 'ringing') {
        if (!calls[called]) calls[called] = []
    }
    let user = await Phone.findOne({ number: called }).catch(e => { throw new Error('database access error to phone ' + called) })
    let reg = await Registration.findOne({ userId: user._id }).catch(e => { throw new Error('database access error to registration ' + user._id) })

    if (status != 'completed') {
        try {
            calls[called].push(status)
        } catch (e) {
            abort(reg._id, called, 'REGABORTED')
            return
        }
    }

    if (status == 'in-progress') {
        setTimeout(() => {
            let length = calls[called] && calls[called].length
            if (length && calls[called][length - 1] == 'in-progress')
                abort(reg._id, called, 'REGABORTED')
        }, 60000)
    }

    if (status == 'completed') {
        if (!calls[called]) return
        let events = ['ringing', 'in-progress']

        if (JSON.stringify(calls[called]) != JSON.stringify(events)) {
            abort(reg._id, called, 'REGABORTED')
        }
        delete calls[called]
    }

    if (status == 'busy' || status == 'failed') {
        abort(reg._id, called, 'REGDECLINED')
        delete calls[called]
    }
})

module.exports = router