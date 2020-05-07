const { Schema, model } = require('mongoose')

const schema = new Schema({
    userId: {
        type: String,
        required: true
    },
    songId: {
        type: String,
        required: true
    },
    date: {
        type: String,
        required: true
    },
    confirmed: {
        type: Boolean,
        default: false
    },
    pending: {
        type: Boolean,
        default: false
    },
    error: {
        type: Boolean,
        default: false
    },
})

module.exports = model('registration', schema)