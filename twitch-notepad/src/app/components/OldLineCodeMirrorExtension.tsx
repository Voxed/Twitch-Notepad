import { Decoration, DecorationSet, EditorView, RangeSetBuilder, ViewPlugin, ViewUpdate } from "@uiw/react-codemirror"

function oldLineDecoration(view: EditorView) {
    const builder = new RangeSetBuilder<Decoration>()
    for (const {from, to} of view.visibleRanges) {
      for (let pos = from; pos <= to;) {
        const line = view.state.doc.lineAt(pos)
        if(line.from < view.state.doc.length - 4000)
            builder.add(line.from, line.from, Decoration.line({
                attributes: { class: "cm-oldLine" }
            }))
        pos = line.to + 1
      }
    }
    return builder.finish()
}


export const oldLines = () => ViewPlugin.fromClass(class {
    decorations: DecorationSet

    constructor(view: EditorView) {
        this.decorations = oldLineDecoration(view)
    }

    update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged)
            this.decorations = oldLineDecoration(update.view)
    }
}, {
    decorations: v => v.decorations
})