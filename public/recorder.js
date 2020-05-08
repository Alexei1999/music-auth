let url = window.location.origin
let eventSource = new EventSource(`${url}/emitter`)

setTimeout(() => {
    window.location.replace(url)
}, 60000)

let getStream
let mediaRecorder
let button

eventSource.addEventListener('ringing', source => {
    console.log('ringing')
    document.querySelector('.small.material-icons').innerText = "mic_none"
    elem = document.querySelector('.tap-target')
    button = M.TapTarget.init(elem)
    button.open()

    getStream = navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
            button.close()
            document.querySelector('.tap-target-content').innerHTML = `<h5>RINGING!</h5>\nОтветьте на вызов!`
            button.open()
        })
        .catch(e => {
            eventSource.close()
            document.querySelector('.tap-target-content').innerHTML = `<h5>DENIED!</h5>\nОткройте доступ к микрофону!`
            button.open()
            setTimeout(() => {
                button.close()
                window.location.replace(`${url}/?error=MICACDENIED&number=${source.data}`)
            }, 3000)
        })
})

eventSource.addEventListener('in-progress', source => {
    console.log('in-progress')
    getStream.then(stream => {
        const audioChunks = [];

        mediaRecorder = new MediaRecorder(stream)
        setTimeout(() => {
            document.querySelector('.small.material-icons').innerText = "mic"
            mediaRecorder.start();
            button.close()
        }, 5000)

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
            console.log('fetched!!!')
            eventSource.close()
            document.querySelector('.tap-target-content').innerHTML = `<h5>Success!</h5>\n
            Запись отправлена на верификацию`
            button.open()
            setTimeout(() => {
                button.close()
                window.location.replace(url)
            }, 3000)
        })
    })
})

eventSource.addEventListener('completed', () => {
    document.querySelector('.small.material-icons').innerText = "mic_off"
    if (mediaRecorder.state == "recording")
        mediaRecorder.stop()
})

eventSource.addEventListener('busy', source => {
    eventSource.close()
    document.querySelector('.small.material-icons').innerText = "error_outline"
    document.querySelector('.tap-target-content').innerHTML = `<h5>BUSY!</h5>\nВы отклонили вызов!`
    button.open()
    setTimeout(() => {
        button.close()
        window.location.replace(`${url}/?error=STBUSY&number=${source.data}`)
    }, 3000)
})

eventSource.addEventListener('failed', source => {
    eventSource.close()
    document.querySelector('.small.material-icons').innerText = "error"
    document.querySelector('.tap-target-content').innerHTML = `<h5>FAILED!</h5>\nВы отклонили вызов!`
    button.open()
    setTimeout(() => {
        button.close()
        window.location.replace(`${url}/?error=STFAILED&number=${source.data}`)
    }, 3000)
})

eventSource.addEventListener('error', () => {
    eventSource.close()
    document.querySelector('.tap-target-content').innerHTML = '<h5>Error!</h5>\nЧто то пошло не так...'
    button.open()
    setTimeout(() => {
        button.close()
        window.location.replace(`${url}/?error=SONGDDREJECT`)
    }, 3000)
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