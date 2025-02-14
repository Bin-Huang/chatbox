import { fetch as tauriFetch } from '@tauri-apps/plugin-http'


// Extend the Window interface to include Tauri-specific properties
declare global {
    interface Window {
      __TAURI__?: {
        // Add any specific Tauri properties you're using
        [key: string]: any;
      }
    }
  }

export const fetch = window.__TAURI__ ? tauriFetch : window.fetch