import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function parseJsonOrEmpty(json: string): any {
    try {
        return JSON.parse(json)
    } catch (e) {
        return {}
    }
}
