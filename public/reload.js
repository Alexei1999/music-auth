let url = window.location.origin
let eventSource = new EventSource(`${url}/reload`)

let elem = document.querySelector('.modal')
let rem = document.querySelector('.card-panel')
if (rem)
    setTimeout(() => rem.remove(), 5000)
let instance = M.Modal.init(elem)

eventSource.addEventListener('error', msg => {
    document.querySelector('.modal-content').innerText = getMessage(msg.data)
    instance.open()
})

eventSource.addEventListener('change', () => window.location.reload())

getMessage = msg => {
    library = {
        'FSDONAVALIBLE': 'Ошибка записи на диск!',
        'WRREQUEST': 'Ошибка запроса на сервер!',
        'REGFAILED': 'Регистрация провалена!',
        'WRID': 'Ошибка записи в базе данных'
    }
    return library[msg] || 'Ошибка сети!'
}