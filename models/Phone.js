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
    regist: {
        type: String
    }
})

module.exports = model('phone', schema)