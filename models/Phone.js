const { Schema, model } = require('mongoose')

const schema = new Schema({
    number: {
        type: String,
        required: true
    },
    active: {
        type: Boolean,
        default: false
    },
    registr: {
        type: String,
        default: null
    }
})

module.exports = model('phone', schema)