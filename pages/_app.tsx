import '@/styles/index.css';
import '@/styles/App.css';
import CssBaseline from '@mui/material/CssBaseline';
import type { AppProps } from 'next/app'

export default function App({ Component, pageProps }: AppProps) {
  return <>
    <CssBaseline />
    <Component {...pageProps} />
  </>
}
