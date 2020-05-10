let url = window.location.origin
let eventSource = new EventSource(`${url}/emitter`)

setTimeout(() => {
    window.location.replace(`${url}`)
}, 60000)

let elem = document.querySelector('.tap-target')
let button = M.TapTarget.init(elem)
let getStream
let mediaRecorder

eventSource.addEventListener('ringing', source => {
    document.querySelector('.small.material-icons').innerText = "mic_none"
    button.open()

    getStream = navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            document.querySelector('.tap-target-content').innerHTML = `<h5>RINGING!</h5>\nОтветьте на вызов!`
            return stream
        })
        .catch(e => {
            eventSource.close()
            document.querySelector('.tap-target-content').innerHTML = `<h5>ACCESS!</h5>\nОткройте доступ к микрофону!`
            button.open()
            setTimeout(() => {
                button.close()
                window.location.replace(`${url}/?error=MICACDENIED&number=${source.data}`)
            }, 3000)
        })
})

eventSource.addEventListener('in-progress', source => {
    button.close()
    getStream.then(stream => {
        const audioChunks = [];
        let i = 0;

        mediaRecorder = new MediaRecorder(stream)
        setTimeout(() => {
            document.querySelector('.small.material-icons').innerText = "mic"
            mediaRecorder.start()
            button.close()
            let progress = () => setTimeout(() => {
                document.querySelector('.determinate').setAttribute('style', `width: ${i++}%`)
                if (i <= 100) progress()
            }, 100)
            progress()
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