export default function debounce(handler, delay = 500) {
    let timer = null

    return function () {
        if (timer) {
            clearTimeout(timer)
        }

        timer = setTimeout(() => {
            handler?.apply(this, arguments)
            timer = null
        }, delay)
    }
}
