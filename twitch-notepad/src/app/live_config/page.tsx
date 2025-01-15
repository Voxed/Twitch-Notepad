'use client';

import { useCallback, useEffect, useRef, useState } from "react";
import App from "../components/app";

export default function LiveConfig() {
    const setContentRef = useRef<(content:string, charCount: number) => void>(()=>{})
    const getContentRef = useRef<() => string>(()=>"")
    const [messageTimeStamps, setMessageTimeStamps] = useState<number[]>([])
    const [messagePerMinute, setMessagesPerMinute] = useState(0)
    const [changed, setChanged] = useState(false)

    const sendMessage = useCallback((content: string) => {
        // If the message has changed OR we havent sent a message in one second (to keep new viewers up to date) we send message
        // also do not send the message if our msg/m >= 90. Hard block to ensure we do not reach 100 msg/m.
        if(((messageTimeStamps.length === 0 || messageTimeStamps.slice(-1)[0] < Date.now() - 1000) || changed) && messagePerMinute < 90) {
            setMessageTimeStamps(messageTimeStamps.filter(n => n > Date.now() - 60000).concat([Date.now()]))
            window.Twitch.ext.send("broadcast", "application/json", JSON.stringify({charCount: (content.match(/\n/g) || []).length + 1, content: content.slice(-4000)}))
            setChanged(false)
        } else {
            setMessageTimeStamps(messageTimeStamps.filter(n => n > Date.now() - 60000))
        }
        setMessagesPerMinute(messageTimeStamps.length)
    }, [messageTimeStamps, messagePerMinute, changed])

    useEffect(() => {
        const timeout = setInterval(() => {
            sendMessage(getContentRef.current())
            // Tick speed algorithm, it will go towards infinitely as msg/m approaches 100. 
            // It will reach a maximum tick delay of 1000ms, at that point we rely on the sendMessage max 90 mpm to stop us from reaching the limit
            // I did reach the limit a couple of time with different algorithm constants, which is weird. My guess is that twitch has some additional 
            // invariants outside of the 100 msg/m.
            // Hopefully this one will work.
        }, Math.min(1000, -Math.log(-messagePerMinute/100 + 1)*500 + 200))
        return () => {clearInterval(timeout)}
    }, [sendMessage, messagePerMinute])

    return <App onChange={()=>{
        setChanged(true)
    }} getContentRef={getContentRef} setContentRef={setContentRef} readonly={false}></App>
}