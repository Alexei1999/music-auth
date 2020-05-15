const Path = require('path')
const fs = require('fs')
let keys = undefined

comparer = (audio, song) => {
    if (audio.artist != song.artist || audio.title != song.title)
        return false

    let [from, to, time] = song.timecode.split('-').concat(audio.timecode).map(t => +t.split(':').join(''))
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

errors = msg => {
    library = {
        'WRNUMBER': 'Номер введен неправильно!',
        'ALREXIST': 'Такой номер уже существует!',
        'SRDONAVALIBLE': 'Регистрация провалена!',
        'SONGDDREJECT': 'Номер не верифицирован!'
    }
    return library[msg] || undefined
}

module.exports = { config, comparer, errors }