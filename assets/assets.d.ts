type Styles = Record<string, string>

declare module '*.svg' {
    import React = require('react')

    export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>

    const content: string
    export default content
}

declare module '*.png' {
    const content: string
    export default content
}

declare module '*.jpg' {
    const content: string
    export default content
}

declare module '*.scss' {
    const content: Styles
    export default content
}

declare module '*.sass' {
    const content: Styles
    export default content
}

declare module '*.css' {
    const content: Styles
    export default content
}
