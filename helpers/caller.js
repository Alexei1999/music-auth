const { config } = require('./utils')

const sid = config().sid
const token = config().token
const fox = config().song

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
            statusCallback: `${config().url}/emitter`,
            twiml: response.toString(),
            from: config().from,
            to: number
        })
}

module.exports = { call }