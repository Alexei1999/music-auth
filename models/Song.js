const { Schema, model } = require('mongoose')

const schema = new Schema({
    timecode: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    artist: {
        type: String,
        required: true
    }
})

module.exports = model('song', schema)