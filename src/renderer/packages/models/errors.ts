export class BaseError extends Error {
    public code = 1
    constructor(message: string) {
        super(message)
    }
}

// 10000 - 19999 is for general errors

export class ApiError extends BaseError {
    public code = 10001
    constructor(message: string) {
        super('API Error: ' + message)
    }
}

export class NetworkError extends BaseError {
    public code = 10002
    public host: string
    constructor(message: string, host: string) {
        super('Network Error: ' + message)
        this.host = host
    }
}

export class AIProviderNoImplementedPaintError extends BaseError {
    public code = 10003
    constructor(aiProvider: string) {
        super(`Current AI Provider ${aiProvider} Does Not Support Painting`)
    }
}

export class AIProviderNoImplementedChatError extends BaseError {
    public code = 10005
    constructor(aiProvider: string) {
        super(`Current AI Provider ${aiProvider} Does Not Support Chat Completions API`)
    }
}

// 20000 - 29999 is for Chatbox AI errors

export class ChatboxAIAPIError extends BaseError {
    static codeNameMap: { [codename: string]: ChatboxAIAPIErrorDetail } = {
        'token_quota_exhausted': {
            name: 'token_quota_exhausted',
            code: 10004,    // for compatibility with the old code
            i18nKey: 'You have reached your monthly quota for the {{model}} model. Please <OpenSettingButton>go to Settings</OpenSettingButton> to switch to a different model, view your quota usage, or upgrade your plan.',
        },
        'license_upgrade_required': {
            name: 'license_upgrade_required',
            code: 20001,
            i18nKey: 'Your current License (Chatbox AI Lite) does not support the {{model}} model. To use this model, please <OpenMorePlanButton>upgrade</OpenMorePlanButton> to Chatbox AI Pro or a higher-tier package. Alternatively, you can switch to a different model by <OpenSettingButton>accessing the settings</OpenSettingButton>.',
        },
        'expired_license': {
            name: 'expired_license',
            code: 20002,
            i18nKey: 'Your license has expired. Please check your subscription or purchase a new one.',
        },
        'license_key_required': {
            name: 'license_key_required',
            code: 20003,
            i18nKey: 'You have selected Chatbox AI as the model provider, but a license key has not been entered yet. Please <OpenSettingButton>click here to open Settings</OpenSettingButton> and enter your license key, or choose a different model provider.'
        },
        'license_not_found': {
            name: 'license_not_found',
            code: 20004,
            i18nKey: 'The license key you entered is invalid. Please check your license key and try again.'
        },
        'rate_limit_exceeded': {
            name: 'rate_limit_exceeded',
            code: 20005,
            i18nKey: 'You have exceeded the rate limit for the Chatbox AI service. Please try again later.'
        },
        'bad_params': {
            name: 'bad_params',
            code: 20006,
            i18nKey: 'Invalid request parameters detected. Please try again later. Persistent failures may indicate an outdated software version. Consider upgrading to access the latest performance improvements and features.'
        },
        'file_type_not_supported': {
            name: 'file_type_not_supported',
            code: 20007,
            i18nKey: 'File type not supported. Supported types include txt, md, html, doc, docx, pdf, excel, pptx, csv, and all text-based files, including code files.'
        },
        'file_expired': {
            name: 'file_expired',
            code: 20008,
            i18nKey: 'The file you sent has expired. To protect your privacy, all file-related cache data has been cleared. You need to create a new conversation or refresh the context, and then send the file again.'
        },
        'file_not_found': {
            name: 'file_not_found',
            code: 20009,
            i18nKey: 'The cache data for the file was not found. Please create a new conversation or refresh the context, and then send the file again.'
        },
        'file_too_large': {
            name: 'file_too_large',
            code: 20010,
            i18nKey: 'The file size exceeds the limit of 50MB. Please reduce the file size and try again.'
        },
        'model_not_support_file': {
            name: 'model_not_support_file',
            code: 20011,
            i18nKey: 'The current model {{model}} does not support sending files. Currently supported models: Chatbox AI 4.'
        },
        'model_not_support_file_2': {
            name: 'model_not_support_file_2',
            code: 20012,
            i18nKey: 'The current model {{model}} does not support sending files.'
        },
        'model_not_support_image': {
            name: 'model_not_support_image',
            code: 20013,
            i18nKey: 'The current model {{model}} does not support sending images. Recommended model: Chatbox AI 4.'
        },
        'model_not_support_image_2': {
            name: 'model_not_support_image_2',
            code: 20014,
            i18nKey: 'The current model {{model}} does not support sending images.'
        },
    }
    static fromCodeName(response: string, codeName: string) {
        if (!codeName) {
            return null
        }
        if (ChatboxAIAPIError.codeNameMap[codeName]) {
            return new ChatboxAIAPIError(response, ChatboxAIAPIError.codeNameMap[codeName])
        }
        return null
    }
    static getDetail(code: number) {
        if (!code) {
            return null
        }
        for (const name in ChatboxAIAPIError.codeNameMap) {
            if (ChatboxAIAPIError.codeNameMap[name].code === code) {
                return ChatboxAIAPIError.codeNameMap[name]
            }
        }
        return null
    }

    public detail: ChatboxAIAPIErrorDetail
    constructor(message: string, detail: ChatboxAIAPIErrorDetail) {
        super(message)
        this.detail = detail
        this.code = detail.code
    }
}

interface ChatboxAIAPIErrorDetail {
    name: string
    code: number
    i18nKey: string
}
