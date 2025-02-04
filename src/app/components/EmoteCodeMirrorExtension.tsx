
import { Facet } from "@uiw/react-codemirror"
import { EmoteHelper, Emote } from "./EmoteHelper"
import { ViewUpdate, ViewPlugin, DecorationSet, WidgetType, MatchDecorator, Decoration, EditorView } from "@codemirror/view"

export const emoteHeight = Facet.define<number, number>({
    combine: values => values[0]
})

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
        const box = new Image()
        box.classList.add("cm-emote")
        box.src = image.url
        box.style.verticalAlign = 'middle'
        box.style.marginBottom = "-100px"
        box.style.marginTop = "-100px"
        box.height = this.emote.images[0].height
        box.width = this.emote.images[0].width
        return box
    }

    ignoreEvent() { return false }
}

//<span contenteditable="false"><img class="cm-emote" src="https://static-cdn.jtvnw.net/emoticons/v2/1/static/light/3.0" height="63" width="84" style="vertical-align: middle; margin-bottom: -10px; margin-top: -16px;"></span>

const emoteMatcher = (emoteHelper: EmoteHelper) => new MatchDecorator({
    regexp: new RegExp(emoteHelper.getRegExp(), 'g'),
    decoration: (match, view,) => {
        return Decoration.replace({
            widget: new EmoteWidget(
                emoteHelper.getEmote(match[0]),
                view.state.facet(emoteHeight)
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