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
    confirmed: {
        type: Boolean,
        default: false
    }
})

module.exports = model('phone', schema)