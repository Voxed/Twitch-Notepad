
import { EmoteHelper, Emote } from "./EmoteHelper"
import { ViewUpdate, ViewPlugin, DecorationSet, WidgetType, MatchDecorator, Decoration, EditorView } from "@codemirror/view"

class EmoteWidget extends WidgetType {
    constructor(readonly emote: Emote, readonly lineHeight: number) {
        super()
    }

    toDOM() {
        let minHeight = 0
        let maxHeight = 999999
        this.emote.images.forEach((e) => {
            if (e.height < this.lineHeight) {
                minHeight = Math.max(minHeight, e.height)
            } else {
                maxHeight = Math.min(maxHeight, e.height)
            }
        })
        const height = maxHeight === 999999 ? minHeight : maxHeight
        const image = this.emote.images.filter(i => i.height === height)[0]
        const wrap = document.createElement("span")
        const box = wrap.appendChild<HTMLImageElement>(new Image())
        box.src = image.url
        box.style.verticalAlign = 'middle'
        box.style.marginBottom = "-10px"
        box.style.marginTop = "-16px"
        box.height = this.lineHeight
        return wrap
    }

    ignoreEvent() { return false }
}

const emoteMatcher = (emoteHelper: EmoteHelper) => new MatchDecorator({
    regexp: new RegExp(emoteHelper.getRegExp(), 'g'),
    decoration: (match, view,) => {
        return Decoration.replace({
            widget: new EmoteWidget(
                emoteHelper.getEmote(match[0]),
                view.defaultLineHeight
            ),
        });
    },
});

export const emotePlugin = (emoteHelper: EmoteHelper) => ViewPlugin.fromClass(class {
    decorations: DecorationSet

    constructor(view: EditorView) {
        this.decorations = emoteMatcher(emoteHelper).createDeco(view);
    }

    update(update: ViewUpdate) {
        this.decorations = emoteMatcher(emoteHelper).updateDeco(update, this.decorations);
    }
}, {
    decorations: v => v.decorations,
    provide: p => EditorView.atomicRanges.of((view) => {
        return view.plugin(p)?.decorations || Decoration.none;
    }),
})