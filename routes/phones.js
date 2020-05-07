const multer = require('multer')
const got = require('got');
const FormData = require('form-data')
const { Router } = require('express')
const { call } = require('../helpers/caller')
const { validationNumber, emitter, config, comparer } = require('../helpers/utils')
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
    const phone = (await Phone.find({ number: req.body.number })).pop()
    console.log('at complete')
    console.log('phone find - ', phone)
    console.log('\n\n')
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

    // setTimeout(() => res.write(`event: ringing\ndata: +number\nid: ${id++}\n\n`), 500)
    // setTimeout(() => res.write(`event: in-progress\ndata: +number\nid: ${id++}\n\n`), 1000)
    // setTimeout(() => res.write(`event: completed\ndata: +number\nid: ${id++}\n\n`), 10000)

    emitter.on('status', (status, called) => {
        res.write(`event: ${status}\ndata: ${called}\nid: ${id++}\n\n`)
    })
})

router.get('/registration', async (req, res) => {
    console.log('at registration')
    console.log('query --> ', req.query)
    const phone = (await Phone.find({ number: `+${req.query.number.slice(1)}` })).pop()
    console.log('phone --> ', phone)
    console.log('\n\n')

    if (!phone) {
        res.redirect('/?error=PDONCONFIRMED')
        return
    }

    let data = await got(`${config().url}/verification/?userId=${phone._id}`).then(data => JSON.parse(data.body))

    console.log('data --> ', data)
    console.log('songId --> ', data.songId)
    const song = (await Song.findById(data.songId))
    console.log('song1 --> ', song)

    call(phone.number, song.url)

    res.render('registration', {
        title: 'registration',
        number: phone.number
    })
})


router.get('/verification', async (req, res) => {
    console.log('at get verification')

    let userId = req.query.userId
    console.log('user id --> ', userId)

    let reg = await Registration.find({ userId: userId, error: false })

    if (!reg.length) {
        let n = Song.count({})
        let r = Math.floor(Math.random() * n)
        const song = await Song.find({}).limit(1).skip(r).then(data => data.pop())
        reg = new Registration({
            userId: userId,
            songId: song._id,
            date: Date.now(),
            pending: true
        })
        reg.save()
    }
    else {
        reg = reg.pop()
    }

    console.log('res: --> regId ', reg._id, ' songIg ', reg.songId)
    res.send(JSON.stringify({ songId: reg.songId, regId: reg._id }))
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

router.post('/verification', upload.single('file'), async (req, res) => {
    console.log('at post verification')
    let number = req.body.number
    let Path = req.file.path
    let phone = (await Phone.find({ number: number })).pop()

    console.log('phone --> ', phone)
    console.log('number --> ', number)
    console.log('path --> ', Path)

    var fd = new FormData()
    fd.append('file', fs.createReadStream(Path))
    fd.append('return', 'timecode')
    fd.append('api_token', config().audD)

    let reqAud = got('https://api.audd.io/',
        {
            method: 'post',
            body: fd
        }
    ).then(raw => {
        fs.unlink(Path, (err) => { console.log('deleting err --> ', err) })
        return JSON.parse(raw.body)
    })

    let reqReg = got(`${config().url}/verification/?userId=${phone._id}`).then(raw => JSON.parse(raw.body))

    let [audio, reg] = await Promise.allSettled([reqAud, reqReg]).then(res => res.map(s => s.value))

    console.log('audio --> ', audio)
    console.log('reg --> ', reg)

    if (audio.status != 'success' || audio.result == null) {
        console.log('stop')
        reg.error = true
        return
    }

    song = await Song.findById(reg.songId)
    reg = await Registration.findById(reg.regId)

    reg.pending = false

    console.log(audio)
    console.log('\n')
    console.log(song)

    //console.log('reg --> ', reg)

    console.log('prepeared to verification, no errors')
    console.log(comparer(audio.result, song))

    res.sendStatus(204)
})

module.exports = router