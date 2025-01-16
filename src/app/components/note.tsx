import CodeMirror, { EditorSelection, EditorState, EditorView, Prec, ReactCodeMirrorRef, TransactionSpec } from '@uiw/react-codemirror';
import { insertNewline, insertTab } from '@codemirror/commands';
import { keymap } from "@codemirror/view"
import { EmoteHelper } from "./EmoteHelper"
import { emotePlugin } from "./EmoteCodeMirrorExtension";
import { Dispatch, RefObject, SetStateAction, useEffect, useRef, useState } from 'react';
import { oldLines } from './OldLineCodeMirrorExtension';

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
    const editorRef = useRef<ReactCodeMirrorRef>({})
    const [emoteHelperReady, setEmoteHelperReady] = useState(false)
    const [emoteHelper] = useState(new EmoteHelper(twitchAuth, "emilya", true, setEmoteHelperReady))
    const [firstSync, setFirstSync] = useState(true)
    const [startsAt, setStartsAt] = useState(0)

    useEffect(() => {
        emoteHelper.init()
    }, [emoteHelper])

    // Notify parent node when ready
    useEffect(() => {
        if (emoteHelperReady && (!readonly || !firstSync))
            setReady(true)
    }, [emoteHelperReady, setReady, firstSync, readonly])

    useEffect(() => {
        setContentRef.current = (content: string, insertAt: number) => {
            console.log(content, insertAt)

            if (editorRef.current.view) {
                let scrollLock: boolean = false;
                if (editorRef.current.view?.scrollDOM)
                    if (editorRef.current.view.scrollDOM.scrollTop >= editorRef.current.view.scrollDOM.scrollHeight - editorRef.current.view.scrollDOM.offsetHeight - 10)
                        scrollLock = true

                const oldScroll = editorRef.current.view.scrollSnapshot()
                const oldSelection = editorRef.current.view.state.selection

                if(editorRef.current.view.state.doc.length == 0 || insertAt < startsAt)
                    setStartsAt(insertAt)

                // This code inserts lines of 79 spaces until we reach the required document length. This is for when the user misses content, most likely because the streamer spammed the editor.
                if(insertAt - startsAt > editorRef.current.view.state.doc.length){
                    editorRef.current.view?.dispatch({
                        changes: [
                            {
                                from: editorRef.current.view.state.doc.length ,
                                insert: (" ".repeat(insertAt - startsAt - editorRef.current.view.state.doc.length).match(/.{1,80}/g) || ["impossible"]).concat([" "]).map(e => e.slice(0, -1)).join('\n')
                            }],
                        filter: false,
                        selection: editorRef.current.view.state.selection,
                    } as TransactionSpec)
                }

                editorRef.current.view?.dispatch({
                    changes: [
                        {
                            from: insertAt - startsAt,
                            to: Math.max(insertAt - startsAt, editorRef.current.view.state.doc.length),
                            insert: content
                        }],
                    filter: false,
                } as TransactionSpec)

                editorRef.current.view?.dispatch({
                    effects: [
                        !scrollLock && !firstSync ? oldScroll : EditorView.scrollIntoView(99999999999999)
                    ],
                    selection: oldSelection.main.to < editorRef.current.view.state.doc.length ? oldSelection.asSingle() : EditorSelection.single(0),
                } as TransactionSpec)
                
                setFirstSync(false)
            }
        }
        getContentRef.current = () => editorRef.current.view?.state.doc.toString() || ""
    }, [getContentRef, setContentRef, firstSync, startsAt])

    return (!emoteHelperReady ? <></> : <CodeMirror height="calc(100vh - var(--app-shell-header-height, 0px))"
        theme={
            EditorView.theme({
                "&": {
                    color,
                    backgroundColor,
                    //padding: "10px",
                    fontSize,
                    fontFamily: "Consolas, monospace"
                },
                ".cm-content": {
                    paddingBottom: '10px',
                    paddingTop: '10px'
                },
                '.cm-line': {
                    paddingLeft: '10px',
                    paddingRight: '10px'
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
                '.cm-oldLine':
                    { 
                        opacity: '0.5'
                     },
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
                EditorState.readOnly.of(readonly),
                EditorView.scrollMargins.of(() => ({top: 10, bottom: 10})),
                EditorState.changeFilter.of((tr) => {
                    let good = true
                    tr.changes.iterChangedRanges((_1, _2, from2) => {
                        if(from2 < tr.newDoc.length - 3900) {
                            good = false
                        }
                    })
                    return good
                }),
                oldLines()
            ]
        }
        basicSetup={
            {
                highlightActiveLine: false,
                searchKeymap: false,
                bracketMatching: false,
                closeBrackets: false,
                indentOnInput: false,
                lineNumbers: false,
                foldGutter: false
            }
        }
        onChange={(v) => {
            onChange(v)
        }}
        ref={editorRef}>
    </CodeMirror>
    )
}