const { url } = require('./network')

const sid = 'number sid'
const token = 'twilli token'
const fox = 'twillio song'

const createResponse = (song) => {
    const VoiceResponse = require('twilio').twiml.VoiceResponse
    const response = new VoiceResponse()
    response.say({
        voice: 'woman'
    }, 'Hi, now the melody will be played, please turn on the microphone')
    response.pause() // default {length: 1} -> 1 sec
    response.play(song)
    return response
}

const call = async (number, song = fox) => {
    const client = require('twilio')(sid, token);
    const response = createResponse(song)

    return client.calls
        .create({
            statusCallbackEvent: ['ringing', 'answered', 'completed'],
            statusCallback: `${url}/emitter`,
            twiml: response.toString(),
            from: 'number',
            to: number
        })
}

module.exports = { call }