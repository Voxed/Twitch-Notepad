import CodeMirror, { EditorState, EditorView, Prec, ReactCodeMirrorRef, TransactionSpec } from '@uiw/react-codemirror';
import { insertNewline, insertTab } from '@codemirror/commands';
import { keymap } from "@codemirror/view"
import { EmoteHelper } from "./EmoteHelper"
import { emotePlugin } from "./EmoteCodeMirrorExtension";
import { Dispatch, RefObject, SetStateAction, useEffect, useRef, useState } from 'react';

interface NoteProps {
    fontSize: string,
    backgroundColor: string,
    color: string,
    twitchAuth: Twitch.ext.Authorized,
    setReady: Dispatch<SetStateAction<boolean>>,
    enableEmotes: boolean,
    readonly: boolean

    setContentRef: RefObject<(content: string, charCount: number) => void>,
    onChange: (content: string) => void,
    getContentRef: RefObject<() => string>
}

export default function Note({ fontSize = "22px", backgroundColor = "#272727", color = "white", twitchAuth, setReady, enableEmotes, readonly, setContentRef, onChange, getContentRef }: NoteProps) {
    // voice shit for future
    /*useEffect(() => {
        setInterval(() => {
            /*if (stre.current?.view && stre.current?.state) {
                
                
                const insertionPoint = stre.current.view.state.doc.toString().split('\n').slice(0, -1).join('\n').length
                
                
                const endOfLine = stre.current.view.state.selection.main.anchor === insertionPoint + "&newStuff&".length
                const offset = stre.current.view.state.doc.toString().indexOf(" &newStuff&") === -1 ? " &newStuff&".length : stre.current.view.state.doc.toString().indexOf(" &newStuff&") + " &newStuff&".length
                

                speechSynthesis.cancel()
                const utterance = new SpeechSynthesisUtterance(stre.current.view.state.doc.sliceString(offset, insertionPoint))
                utterance.voice = speechSynthesis.getVoices()[12]
                speechSynthesis.speak(utterance)
                

                stre.current.view.dispatch(
                {
                    changes: {
                        from: insertionPoint,
                        to: insertionPoint,
                        insert: " &newStuff&"
                    },
                    selection: {
                        anchor: endOfLine ? insertionPoint + " &newStuff&".length : stre.current.view.state.selection.main.anchor + " &newStuff&".length,
                        head: stre.current.view.state.selection.main.head + " &newStuff&".length
                    },
                    filter: false
                },
                stre.current.view.state.doc.toString().indexOf("&newStuff&") !== -1 ? {
                    changes: {
                        from: stre.current.view.state.doc.toString().indexOf(" &newStuff&"),
                        to: stre.current.view.state.doc.toString().indexOf(" &newStuff&") + 11,
                        insert: ""
                    },
                    filter: false
                } : {})
            }*/
    /*}, 5000)
    }, [])*/

    const editorRef = useRef<ReactCodeMirrorRef>({})
    const [emoteHelperReady, setEmoteHelperReady] = useState(false)
    const [emoteHelper] = useState(new EmoteHelper(twitchAuth, "emilya", true, setEmoteHelperReady))
    const [firstSync, setFirstSync] = useState(true)
    const [prevLineDelta, setPrevLineDelta] = useState(0)

    useEffect(() => {
        emoteHelper.init()
    }, [emoteHelper])

    // Notify parent node when ready
    useEffect(() => {
        if (emoteHelperReady && !firstSync)
            setReady(true)
    }, [emoteHelperReady, setReady, firstSync])

    useEffect(() => {
        setContentRef.current = (content: string, charCount: number) => {
            if (editorRef.current.view) {
                let scrollLock: boolean = false;
                if (editorRef.current.view?.scrollDOM)
                    if (editorRef.current.view.scrollDOM.scrollTop >= editorRef.current.view.scrollDOM.scrollHeight - editorRef.current.view.scrollDOM.offsetHeight - 10)
                        scrollLock = true

                const lineDelta = charCount - ((content.match(/\n/g) || []).length + 1)
                const linesToAdd = lineDelta - prevLineDelta
                const oldScroll = editorRef.current.view.scrollSnapshot()

                editorRef.current.view?.dispatch({
                    changes: [
                        {
                            from: 0,
                            to: linesToAdd > 0 ? 0 : -linesToAdd,
                            insert: linesToAdd > 0 ? "\n".repeat(linesToAdd) : ''
                        },
                        {
                            from: prevLineDelta,
                            to: editorRef.current.view.state.doc.length,
                            insert: content
                        }],
                    filter: false,
                    selection: editorRef.current.view.state.selection
                } as TransactionSpec)

                editorRef.current.view?.dispatch({
                    effects: [
                        !scrollLock && !firstSync ? oldScroll : EditorView.scrollIntoView(99999999999999)
                    ],
                } as TransactionSpec)
                
                setPrevLineDelta(lineDelta)
                setFirstSync(false)
            }
        }
        getContentRef.current = () => editorRef.current.view?.state.doc.toString() || ""
    }, [getContentRef, setContentRef, firstSync, prevLineDelta])

    return (!emoteHelperReady ? <></> : <CodeMirror height="calc(100vh - var(--app-shell-header-height, 0px))"
        theme={
            EditorView.theme({
                "&": {
                    color,
                    backgroundColor,
                    padding: "10px",
                    fontSize,
                    fontFamily: "Consolas, monospace"
                },
                "&.cm-focused .cm-cursor": {
                    borderLeftColor: color
                },
                ".cm-gutters": {
                    display: "none"
                },
                ".cm-selectionMatch": {
                    backgroundColor: "transparent"
                },
                '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
                    { backgroundColor: "#0078d7" },
            })
        }
        extensions={
            [
                enableEmotes ? emotePlugin(emoteHelper) : [],
                EditorView.lineWrapping,
                Prec.highest(keymap.of(
                    [
                        {
                            key: "Enter",
                            run: (view) => {
                                insertNewline(view);
                                return true;
                            },
                        },
                        {
                            key: "Tab",
                            run: (view) => {
                                insertTab(view);
                                return true;
                            },
                        },
                    ]
                )),
                EditorState.readOnly.of(readonly)
            ]
        }
        basicSetup={
            {
                highlightActiveLine: false,
                searchKeymap: false,
                bracketMatching: false,
                closeBrackets: false,
                indentOnInput: false
            }
        }
        onChange={onChange}
        ref={editorRef}>
    </CodeMirror>
    )
}