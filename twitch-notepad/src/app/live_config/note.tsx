import { RichTextEditor } from "@mantine/tiptap";
import { useEditor } from "@tiptap/react";
import Text from "@tiptap/starter-kit"
import { CSSProperties, Ref, useEffect, useCallback, useRef, useState } from "react"

import { gql } from "@/gql/7tv"
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';

import CodeMirror, { EditorState, EditorView, Extension, Prec, Range, RangeSet, ReactCodeMirrorRef, TransactionSpec } from '@uiw/react-codemirror';

import { insertNewline } from '@codemirror/commands';

import { keymap, WidgetType } from "@codemirror/view"
import { Decoration } from "@codemirror/view"
import { syntaxTree } from "@codemirror/language"

import EmoteHelper from "./EmoteHelper"

class CheckboxWidget extends WidgetType {
    constructor(readonly url: string) { super() }

    toDOM() {
        let wrap = document.createElement("span")
        wrap.setAttribute("aria-hidden", "true")
        wrap.className = "cm-boolean-toggle"
        const box = wrap.appendChild<HTMLImageElement>(new Image())
        box.src = this.url
        box.style.verticalAlign = 'middle'
        box.style.marginBottom = "-10px"
        box.style.marginTop = "-16px"
        box.height = 32
        return wrap
    }

    ignoreEvent() { return false }
}

function checkboxes(view: EditorView) {
    let widgets = []
    for (let { from, to } of view.visibleRanges) {
        const t = view.state.doc.toString()

        const re = /((?<=^|[\n ])(aga|hi|widepeepoHappy)(?=$|[\n ]))|&newStuff&/g
        var match, indexes = [];
        while (match = re.exec(t)) {
            let deco = Decoration.replace({
                widget: new CheckboxWidget(
                    match[0] == "&newStuff&" ? "https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Speaker_Icon.svg/1024px-Speaker_Icon.svg.png" :
                        match[0] == "widepeepoHappy" ? "https://cdn.7tv.app/emote/01GF1Y2Q5G0000BGNJSP34TQRD/1x.avif" :
                            match[0] == "hi" ? "https://cdn.7tv.app/emote/01GX6M9TRR000DJJ63WGMEA4Z8/1x.avif" : "https://cdn.7tv.app/emote/01HMBMJPV0000D32KQCYBK4S1D/1x.avif"),
            })
            //if(match[0] == "&newStuff&")
            //    deco = Decoration.replace({})
            widgets.push(deco.range(match.index, match.index + match[0].length))
        }
    }
    return [Decoration.set(widgets), RangeSet.of(widgets)]
}

import { ViewUpdate, ViewPlugin, DecorationSet } from "@codemirror/view"

const checkboxPlugin = ViewPlugin.fromClass(class {
    decorations: DecorationSet
    atomicRanges: RangeSet<any>

    constructor(view: EditorView) {
        const ret = checkboxes(view)
        this.decorations = ret[0]
        this.atomicRanges = ret[1]
    }

    update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged ||
            syntaxTree(update.startState) != syntaxTree(update.state)) {
            const ret = checkboxes(update.view)

            this.decorations = ret[0]
            this.atomicRanges = ret[1]
        }
    }
}, {
    decorations: v => v.decorations,
    provide: p => EditorView.atomicRanges.of((view) => {
        return view.plugin(p)?.decorations || Decoration.none;
    }),

    eventHandlers: {
        mousedown: (e, view) => {
            let target = e.target as HTMLElement
            if (target.nodeName == "INPUT" &&
                target.parentElement!.classList.contains("cm-boolean-toggle"))
                return toggleBoolean(view, view.posAtDOM(target))
        }
    }
})


function toggleBoolean(view: EditorView, pos: number) {
    let before = view.state.doc.sliceString(Math.max(0, pos - 5), pos)
    let change
    if (before == "false")
        change = { from: pos - 5, to: pos, insert: "true" }
    else if (before.endsWith("true"))
        change = { from: pos - 4, to: pos, insert: "false" }
    else
        return false
    view.dispatch({ changes: change })
    return true
}


export function check(): Extension {
    return [
        checkboxPlugin,
        EditorState.changeFilter.of((tr) => {
            const ranges: number[] = []
            const re = /&newStuff&/g
            let match: RegExpExecArray | null;
            while (match = re.exec(tr.startState.doc.toString())) {
                ranges.push(match.index, match.index + 10)
            }
            return ranges
        })
    ]
}


interface NoteProps {
    fontSize: string,
    backgroundColor: string,
    color: string,

    twitchAuth: Twitch.ext.Authorized
}

export default function Note({ fontSize = "22px", backgroundColor = "#272727", color = "white", twitchAuth }: NoteProps) {
    const editorRef = useRef<ReactCodeMirrorRef>(null)

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

    const [emoteHelper] = useState(new EmoteHelper(twitchAuth, "emilya"))
    useEffect(() => {
        emoteHelper.init()
    }, [emoteHelper])

    return <CodeMirror height="calc(100vh - var(--app-shell-header-height, 0px))"
        ref={editorRef}
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
                check(),
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
                    ]
                ))
            ]
        }
        basicSetup={
            {
                highlightActiveLine: false,
                searchKeymap: false,
            }
        }>
    </CodeMirror>
}