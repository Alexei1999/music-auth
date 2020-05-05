let eventSource = new EventSource('http://localhost:3000/emitter')

// navigator.mediaDevices.getUserMedia({ audio: true })
//     .then(stream => {
//         const mediaRecorder = new MediaRecorder(stream);
//         mediaRecorder.start();

//         const audioChunks = [];
//         mediaRecorder.addEventListener("dataavailable", event => {
//             audioChunks.push(event.data);
//         });

//         mediaRecorder.addEventListener("stop", () => {
//             const audioBlob = new Blob(audioChunks);
//             const audioUrl = URL.createObjectURL(audioBlob);
//             audio.play();
//         });

//         setTimeout(() => {
//             mediaRecorder.stop();
//         }, 3000);
//     });

eventSource.addEventListener('ringing', () => {
    console.log('attention to micro')
})

eventSource.addEventListener('in-progress', () => {
    console.log('run micro')
})

eventSource.addEventListener('busy', () => {
    console.log('registration redirect')
})

eventSource.addEventListener('completed', () => {
    console.log('go to home')
})

eventSource.addEventListener('failed', () => {
    console.log('wtf')
})

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