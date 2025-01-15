'use client';

import { useEffect, useRef } from "react";
import App from "../components/app";

export default function VideoComponent() {
    const setContentRef = useRef<(content:string, charCount: number) => void>(()=>{})
    const getContentRef = useRef<() => string>(()=>"")

    useEffect(() => {
        window.Twitch.ext.listen("broadcast", (_target, _contentType, message) => {
            const payload: {charCount: number, content: string} = JSON.parse(message)
            setContentRef.current(payload.content, payload.charCount)
        })
    }, [])

    return <App onChange={()=>{}} getContentRef={getContentRef} setContentRef={setContentRef} readonly={true}></App>
}