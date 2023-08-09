import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import reportWebVitals from './reportWebVitals'
import ReactGA from 'react-ga4'
import * as store from './stores/store'
import * as runtime from './packages/runtime'
import './i18n'

import './styles/index.css'
import './styles/index.scss'

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()

// 禁止右键点击菜单在 release 中的展示
function disableMenu() {
    if (window.location.hostname !== 'tauri.localhost') {
        return
    }
    document.addEventListener(
        'contextmenu',
        (e) => {
            e.preventDefault()
            return false
        },
        { capture: true },
    )
}
disableMenu()

// ga4
;(async () => {
    const GAID = 'G-B365F44W6E'
    try {
        const conf = await store.readConfig()
        const version = await runtime.getVersion()
        ReactGA.initialize([
            {
                trackingId: GAID,
                gaOptions: {
                    app_version: version,
                    clientId: conf.uuid,
                },
                gtagOptions: {
                    app_version: version,
                    clientId: conf.uuid,
                },
            },
        ])
    } catch (e) {
        ReactGA.initialize(GAID)
        throw e
    }
})()
