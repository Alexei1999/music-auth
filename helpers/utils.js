const emitter = new (require('events'))()
const Path = require('path')
const fs = require('fs')
let keys = undefined

validationNumber = (number) => {

}

comparer = (audio, song) => {
    console.log('at comparer')
    console.log(audio)
    console.log(song)
    if (audio.artist != song.artist || audio.title != song.title)
        return false

    console.log(audio.timecode)
    console.log(audio.timecode.split(':'))
    console.log(audio.timecode.split(':').join(''))
    console.log(+audio.timecode.split(':').join(''))
    console.log('lets split something')
    console.log(song.timecode)
    console.log(song.timecode.split('-'))
    console.log(song.timecode.split('-').concat(audio.timecode))
    console.log(song.timecode.split('-').concat(audio.timecode).map(t => +t.split(':').join('')))
    console.log('lets go)')

    let [from, to, time] = song.timecode.split('-').concat(audio.timecode).map(t => +t.split(':').join(''))
    console.log(from, to, time)
    if (time < from || time > to)
        return false
    return true
}

config = (url = undefined) => {
    let path = Path.resolve(__dirname, '../config.json')
    if (!keys) {
        let data = fs.readFileSync(path, 'utf8')
        keys = JSON.parse(data)
    }
    if (url)
        keys.url = url;
    return keys
}
module.exports = { config, validationNumber, emitter, comparer }