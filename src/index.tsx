import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import reportWebVitals from './reportWebVitals';
import './i18n.js'

import './styles/index.css'
import './styles/index.scss'

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

// 禁止右键点击菜单在 release 中的展示
function disableMenu() {
    if (window.location.hostname !== 'tauri.localhost') {
        return
    }
    document.addEventListener('contextmenu', e => {
        e.preventDefault();
        return false;
    }, { capture: true })
}
disableMenu()
