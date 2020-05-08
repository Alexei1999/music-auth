const multer = require('multer')
const got = require('got');
const FormData = require('form-data')
const { Router } = require('express')
const { call } = require('../helpers/caller')
const { emitter, config, comparer } = require('../helpers/utils')
const Phone = require('../models/Phone')
const Registration = require('../models/Registration')
const Song = require('../models/Song')
const path = require('path')
const fs = require('fs')

const upload = multer({ dest: path.resolve(__dirname, '../public/uplods/') })
const router = Router()

router.get('/', async (req, res) => {

    notify = req.body.error

    const phones = await Phone.find({}).lean()
    const registrations = {};

    (await Registration.find({}))
        .forEach(reg => registrations[reg.userId] = reg)

    const buttons = phones.map(phn => {
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
        }
        return res
    })

    res.render('index', {
        title: 'Numbers list',
        isIndex: true,
        notify,
        buttons
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

    if (!number.match(/^\+\d*$/))
        return res.redirect('/create/?error=WRNUMBER')

    let phone = await Phone.findOne({ number: number })

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
    console.log('complete')
    let phone
    try {
        phone = await Phone.findOne({ number: req.body.number })
        registr = await Registration.findById(phone.registr)
    } catch (e) {
        return res.redirect('/?error=WRNUMBER')
    }

    //if (!registr.confirmed)
    return res.redirect('/registration/?number=' + phone.number)

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

router.get('/reload', async (req, res) => {
    let id = 0

    res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
    })

    emitter.on('change', () => {
        res.write(`event: ${status}\nid: ${id++}\n\n`)
    })
    emitter.on('error', () => {
        res.write(`event: ${status}\nid: ${id++}\n\n`)
    })
})

router.get('/emitter', async (req, res) => {
    let id = 0

    res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
    })

    setTimeout(() => res.write(`event: ringing\ndata: +number\nid: ${id++}\n\n`), 500)
    setTimeout(() => res.write(`event: in-progress\ndata: +number\nid: ${id++}\n\n`), 1000)
    setTimeout(() => res.write(`event: completed\ndata: +number\nid: ${id++}\n\n`), 5000)

    // emitter.on('status', (status, called) => {
    //     res.write(`event: ${status}\ndata: ${called}\nid: ${id++}\n\n`)
    // })
})

router.get('/registration', async (req, res) => {
    let phone
    try {
        phone = await Phone.findOne({ number: `+${req.query.number.slice(1)}` })
    } catch (e) {
        return res.redirect('/?error=WRNUMBER')
    }

    let data
    try {
        data = await got(`${config().url}/verification/?userId=${phone._id}`)
            .then(data => JSON.parse(data.body))
    } catch (e) {
        return res.redirect('/?error=SRDONAVALIBLE')
    }
    const song = await Song.findById(data.songId)
    let sid = 'sdfsafadsf'//call(phone.number, song.url).then(call => call.sid)

    res.render('registration', {
        title: 'registration',
        number: phone.number,
        sid: sid
    })
})


router.get('/verification', async (req, res) => {
    let phone = await Phone.findById(req.query.userId)

    try {
        await Registration.findByIdAndRemove(phone.registr)
    } catch (e) {
        emitter.emit('error', {
            name: 'WRID',
        })
        return res.sendStatus(204)
    }
    let n = Song.count({})
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

router.post('/audd', (req, res) => {
    res.send(JSON.stringify({
        status: 'success',
        result: {
            artist: 'Ylvis',
            title: 'The Fox (What Does The Fox Say?)',
            album: 'The Fox (What Does The Fox Say?)',
            release_date: '2013-09-02',
            label: 'WM Norway',
            timecode: '00:13'
        }
    }))
})

let abort = async (id, error) => {
    console.log('aborted --> ', error)
    await Registration
        .findById(id)
        .then(reg => {
            reg.pending = false
            reg.error = true
            return reg
        })
    then(reg => reg.save())
    emitter.emit('error', error)
}

router.post('/verification', upload.single('file'), async (req, res) => {
    let phone = await Phone.findOne({ number: req.body.number })
    let reg = await Registration.findById(phone.registr)
    let Path = req.file.path

    var fd = new FormData()
    try {
        fd.append('file', fs.createReadStream(Path))
        fd.append('return', 'timecode')
        fd.append('api_token', config().audD)
    } catch (e) {
        console.log(e)
        await abort(reg._id, 'FSDONAVALIBLE')
        return res.sendStatus(204)
    }

    let audio, song
    try {
        let reqAud = got(`${config().url}/audd`,//'https://api.audd.io/',
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
        console.log(e)
        await abort(reg._id, 'WRREQUEST')
        return res.sendStatus(204)
    }

    reg.pending = false
    await reg.save()
    emitter.emit('change')

    if (audio.status != 'success' || audio.result == null) {
        reg.error = true
        await reg.save()
        emitter.emit('change')
        return res.redirect('/?error=REGFAILED')
    }
    else audio = audio.result

    if (comparer(audio, song)) reg.confirmed = true
    else reg.error = true

    await reg.save()
    emitter.emit('change')

    res.sendStatus(204)
})

module.exports = router