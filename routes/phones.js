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
    console.log('main')
    const phones = await Phone.find({}).lean()
    const registrations = {};

    (await Registration.find({}))
        .forEach(reg => registrations[reg.userId] = reg)

    const buttons = phones.map(phn => {
        let tar = registrations[phn._id]
        let res = {
            number: phn.number,
            active: phn.active,
            pending: tar ? tar.pending : false,
            error: tar ? tar.error : false,
            confirmed: tar ? tar.confirmed : false
        }
        if (tar && tar.error) {
            Registration
                .findById(phn.registr)
                .setOptions({ error: false })
                .save()
        }
        return res
    })

    res.render('index', {
        title: 'Numbers list',
        isIndex: true,
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

    const phone = new Phone({
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
    } catch (e) {
        return res.redirect('/?error=WRNUMBER')
    }

    if (!phone.confirmed)
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
    console.log('registration')
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
    console.log(data)
    const song = await Song.findById(data.songId)
    //call(phone.number, song.url)

    res.render('registration', {
        title: 'registration',
        number: phone.number
    })
})


router.get('/verification', async (req, res) => {
    console.log('verification')
    let user = await Phone.findById(req.query.userId)

    try {
        Registration.findByIdAndRemove(user.registr)
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
        userId: user._id,
        songId: song._id,
        date: Date.now(),
        pending: true
    })
    await reg.save()
    user.registr = reg._id
    await user.save()
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
        .setOptions({ pending: false, error: true })
        .save()
    emitter.emit('error', error)
}

router.post('/verification', upload.single('file'), async (req, res) => {
    console.log('verification2')
    console.log('at verification')
    let phone = await Phone.findOne({ number: req.body.number })
    let reg = await Registration.findById(phone.registr)
    let Path = req.file.path
    console.log('number --> ', phone.number)

    var fd = new FormData()
    try {
        fd.append('file', fs.createReadStream(Path))
        fd.append('return', 'timecode')
        fd.append('api_token', config().audD)
    } catch (e) {
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
            fs.unlink(Path, (err) => console.log(err))
            return JSON.parse(raw.body)
        })
        let reqSong = got(`${config().url}/verification/?userId=${phone._id}`).then(raw => JSON.parse(raw.body));
        [audio, sng] = await Promise.all([reqAud, reqSong]);
        song = Song.findById(sng.songId);
    } catch (e) {
        await abort(reg._id, 'WRREQUEST')
        return res.sendStatus(204)
    }

    reg.pending = false
    await reg.save()
    emitter.emit('change')

    if (audio.status != 'success' || audio.result == null) {
        console.log('stop')
        reg.error = true
        reg.save()
        emitter.emit('change')
        return res.redirect('/?error=REGFAILED')
    }
    else audio = audio.result

    if (comparer(audio, song)) {
        console.log('true')
        reg.confirmed = true
    }
    else {
        console.log('false')
        reg.error = true
    }

    await reg.save()
    emitter.emit('change')

    res.sendStatus(204)
})

module.exports = router

// router.get('/addsong', async () => {
//     let fox = new Song({
//         timecode: '00:04-00:14',
//         url: 'fox-say.mp3',
//         title: 'The Fox (What Does The Fox Say?)',
//         artist: 'Ylvis'
//     })
//     fox.save()

//     let igy = new Song({
//         timecode: '00:59-01:09',
//         url: 'tony-igi.mp3',
//         title: 'Astronomia',
//         artist: 'Tony Igi'
//     })

//     igy.save()
//     let p21 = new Song({
//         timecode: '02:30-02:40',
//         url: '21-pilots.mp3',
//         title: 'Heathens',
//         artist: 'twenty one pilots'
//     })
//     p21.save()

// })