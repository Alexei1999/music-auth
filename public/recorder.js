
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

fetch('http://localhost:3000/test').then(res => res.text()).then(text => console.log(text))