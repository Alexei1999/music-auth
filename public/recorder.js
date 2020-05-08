let url = window.location.origin
let eventSource = new EventSource(`${url}/emitter`)

let getStream
let mediaRecorder
let button

eventSource.addEventListener('ringing', () => {
    document.querySelector('.small.material-icons').innerText = "mic_none"
    elem = document.querySelector('.tap-target')
    button = M.TapTarget.init(elem)
    button.open()

    getStream = navigator.mediaDevices.getUserMedia({ audio: true })
        .catch(e => window.location.replace(`${url}/?error=MICACDENIED`))
})

eventSource.addEventListener('in-progress', source => {
    getStream.then(stream => {
        const audioChunks = [];

        mediaRecorder = new MediaRecorder(stream)
        document.querySelector('.small.material-icons').innerText = "mic"
        mediaRecorder.start()
        button.close()
        //setTimeout(() => { console.log('start'); mediaRecorder.start(); }, 5000)

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
    document.querySelector('.small.material-icons').innerText = "mic_off"
    if (mediaRecorder.state == "recording")
        mediaRecorder.stop()
})

eventSource.addEventListener('busy', () => {
    document.querySelector('.small.material-icons').innerText = "error_outline"
    window.location.replace(`${url}/?error=STBUSY`)
})

eventSource.addEventListener('failed', () => {
    document.querySelector('.small.material-icons').innerText = "error"
    window.location.replace(`${url}/?error=STFAILED`)
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