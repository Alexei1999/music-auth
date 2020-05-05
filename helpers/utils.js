const emitter = new (require('events'))()
const path = require('path')
const fs = require('fs')
let keys = undefined

validationNumber = (number) => {

}

config = () => {
    if (!keys) {
        let data = fs.readFileSync(path.resolve(__dirname, '../config.json'), 'utf8')
        keys = JSON.parse(data)
    }
    return keys
}

module.exports = { config, validationNumber, emitter }