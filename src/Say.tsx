import {useState} from "react";
import {Message} from "@/src/types";
import { dialog,fs as taurifs } from '@tauri-apps/api';
import {Props} from "@/src/Block";
import {IconButton,Checkbox} from "@mui/material";

import VoiceOverOffIcon from "@mui/icons-material/VoiceOverOff";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import {useTranslation} from "react-i18next";

let currentmediaRecorder : MediaRecorder | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;
let currentIndex: string = "-1";
const synth = window.speechSynthesis;

function blobPartToArrayBuffer(blobParts:BlobPart[]) {
    return new Promise ((resolve, reject) => {
        const fileReader = new FileReader();
        fileReader.onload = () => {
            resolve(fileReader.result);
        };
        fileReader.onerror = () => {
            reject(fileReader.error);
        };
        fileReader.readAsArrayBuffer(new Blob(blobParts));
    });
}
export function Say(props: Props) {
    const { t } = useTranslation()
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [checked, setChecked] = useState(false);
    const { msg } = props;
    const { speech } = props;

    const handleSay = (msg:Message,speech:String|null) => {
        if (currentUtterance && currentIndex !== "-1") {
            synth.cancel();
            if(currentmediaRecorder)currentmediaRecorder.stop();
            currentmediaRecorder=null;
            setIsSpeaking(false);
            if (msg.id === currentIndex) {
                currentUtterance = null;
                currentIndex = "-1";
                return;
            }
        }
        const txt = msg.content?.trim() || ''
        if (!txt) return;
        const utterance = new SpeechSynthesisUtterance(txt);
        const voices = speechSynthesis.getVoices();
        // "speech_lang": "Microsoft Yaoyao - Chinese (Simplified, PRC)",
        // "Microsoft Xiaoxiao Online (Natural) - Chinese (Mainland)"
        let voice = voices.find(voice => voice.name === speech);
        if (!voice) {
            voice = voices.find(voice => voice.lang === 'zh-CN');
        }
        utterance.voice=voice?voice:null;
        currentIndex = msg.id;
        // utterance.lang = voice.lang;
        // utterance.volume = 1;
        // utterance.rate = 0.8;
        // utterance.pitch = 1;
        if(checked) {
            audioSave().then(() => {
                synth.speak(utterance);
                setIsSpeaking(true);
                currentUtterance = utterance;
                currentIndex = msg.id;
            });
        }else{
            synth.speak(utterance);
            setIsSpeaking(true);
            currentUtterance = utterance;
            currentIndex = msg.id;
        }
        utterance.onend = () => {
            if(currentmediaRecorder)
                currentmediaRecorder.stop();
            currentmediaRecorder=null;
            setIsSpeaking(false);
            currentUtterance = null;
            currentIndex = "-1";
        }
    };
    const audioSave = async () => {
        const options = {
            defaultPath: 'audio.mp3',
            filters: [{name: 'Audio Files', extensions: ['mp3']}]
        };
        let filename: string= options.defaultPath;
        filename = await dialog.save(options) as string;
        console.log('Selected file:', filename);
        const constraints = {audio: true};
        navigator.mediaDevices.getUserMedia(constraints)
            .then(stream => {
                const chunks: BlobPart[] | undefined = [];
                const mediaRecorder = new MediaRecorder(stream);
                currentmediaRecorder = mediaRecorder;
                mediaRecorder.addEventListener('dataavailable', event => {
                    chunks.push(event.data);
                });

                mediaRecorder.addEventListener('stop', () => {
                    stream.getTracks().forEach(track => track.stop());
                    if(filename!=null) {
                        blobPartToArrayBuffer(chunks).then((data)=> {
                            taurifs.writeBinaryFile(filename,
                                data as ArrayBuffer);
                        });
                    }
                });
                mediaRecorder.start();
                setTimeout(() => {
                    mediaRecorder.stop();
                    stream.getTracks().forEach(track => track.stop());
                }, 1000*60*10);
            })
            .catch(error => {
                console.error(error);
            });
    };

    return (
        isSpeaking
        ?(
            <IconButton onClick={()=> {
                handleSay(msg,speech)
            }} size='large' color='primary'>
                <VoiceOverOffIcon fontSize='small' />
            </IconButton>)
        : (
            <>
                <IconButton onClick={()=>{
                    handleSay(msg,speech)
                }} size='large' color='primary'>
                    <RecordVoiceOverIcon fontSize='small' />
                </IconButton>
                <Checkbox
                    checked={checked}
                    onChange={(event) => {
                        setChecked(event.target.checked);
                    }
                }
                    title={t('save audio to file') as string}
                />
            </>
        )
    );
}
