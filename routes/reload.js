let url = window.location.origin
let eventSource = new EventSource(`${url}/reload`)

eventSource.addEventListener('error', () => { })

eventSource.addEventListener('change', () => { })