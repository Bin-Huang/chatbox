import SimpleSelect from './SimpleSelect'
import { ChatboxAIModel } from '../../shared/types'
import { useTranslation } from 'react-i18next'
import { chatboxAIModels } from '@/packages/models/chatboxai'

export interface Props {
    value?: ChatboxAIModel
    onChange(value?: ChatboxAIModel): void
    className?: string
}

export default function ChatboxAIModelSelect(props: Props) {
    const { t } = useTranslation()
    const chatboxAIModelLabelHash: Record<ChatboxAIModel, React.ReactNode> = {
        'chatboxai-3.5': (
            <span className="inline-flex items-center">
                <svg
                    className="w-4 h-4 mr-1 opacity-50"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                    />
                </svg>
                Chatbox-AI 3.5
            </span>
        ),
        'chatboxai-4': (
            <span className="inline-flex items-center">
                <svg
                    className="w-4 h-4 mr-1 opacity-50"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                    />
                </svg>
                Chatbox-AI 4
            </span>
        ),
    }
    return (
        <SimpleSelect
            label={t('model')}
            value={props.value || 'chatboxai-3.5'}
            options={chatboxAIModels.map((value) => ({ value, label: chatboxAIModelLabelHash[value] }))}
            onChange={props.onChange}
            className={props.className}
        />
    )
}
