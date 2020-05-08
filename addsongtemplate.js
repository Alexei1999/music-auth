router.get('/addsong', async () => {
    let fox = new Song({
        timecode: '00:04-00:14',
        url: 'fox-say.mp3',
        title: 'The Fox (What Does The Fox Say?)',
        artist: 'Ylvis'
    })
    fox.save()

    let igy = new Song({
        timecode: '00:59-01:09',
        url: 'tony-igi.mp3',
        title: 'Astronomia',
        artist: 'Tony Igi'
    })

    igy.save()
    let p21 = new Song({
        timecode: '02:30-02:40',
        url: '21-pilots.mp3',
        title: 'Heathens',
        artist: 'twenty one pilots'
    })
    p21.save()
})