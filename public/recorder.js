let url = 'http://localhost:3000'//window.location.host
let eventSource = new EventSource(`${url}/emitter`)

let getStream
let mediaRecorder

eventSource.addEventListener('ringing', () => {
    getStream = navigator.mediaDevices.getUserMedia({ audio: true })
        .catch(e => console.log('Дайте микрофон бля'))
})

eventSource.addEventListener('in-progress', source => {
    getStream.then(stream => {
        const audioChunks = [];

        mediaRecorder = new MediaRecorder(stream)
        mediaRecorder.start()
        setTimeout(() => { console.log('start'); mediaRecorder.start(); }, 5000)

        mediaRecorder.addEventListener("dataavailable", event => {
            audioChunks.push(event.data)
        })

        mediaRecorder.addEventListener("stop", async () => {
            stream.getTracks().forEach(track => {
                track.stop()
            })
            const audioBlob = new Blob(audioChunks)

            var fd = new FormData()
            fd.append('file', audioBlob, 'audio.wav')
            fd.append('number', source.data)

            fetch(`${url}/verification`,
                {
                    method: 'post',
                    body: fd
                }
            )
            eventSource.close()
            window.location.replace(url)
        })
    })
})

eventSource.addEventListener('completed', () => {
    console.log('stop recording')
    console.log(mediaRecorder.state)
    if (mediaRecorder.state == "recording")
        mediaRecorder.stop()
})

eventSource.addEventListener('busy', () => {
    console.log('busy')
})

eventSource.addEventListener('failed', () => {
    console.log('failed')
})


// close()

// good                     good
// attention to micro       ringing
// run micro                in-progress
// go to home               completed

// busy                     busy
// attention to micro       ringing
// registration redirect    busy

// no answer                no answer
// attention to micro       ringing
// wtf                      failed