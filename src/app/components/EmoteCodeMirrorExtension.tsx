
import { EmoteHelper, Emote } from "./EmoteHelper"
import { ViewUpdate, ViewPlugin, DecorationSet, WidgetType, MatchDecorator, Decoration, EditorView } from "@codemirror/view"

class EmoteWidget extends WidgetType {
    constructor(readonly emote: Emote) {
        super()
    }

    toDOM() {
        const box = new Image()
        box.classList.add("cm-emote")
        box.srcset = this.emote.images.map(ei => `${ei.url} ${ei.width}w`).join(', ')
        box.style.verticalAlign = 'middle'
        box.style.marginBottom = "auto"
        box.style.marginTop = "auto"
        box.height = this.emote.images[0].height
        box.width = this.emote.images[0].width
        return box
    }

    ignoreEvent() { return false }
}

//<span contenteditable="false"><img class="cm-emote" src="https://static-cdn.jtvnw.net/emoticons/v2/1/static/light/3.0" height="63" width="84" style="vertical-align: middle; margin-bottom: -10px; margin-top: -16px;"></span>

const emoteMatcher = (emoteHelper: EmoteHelper) => new MatchDecorator({
    regexp: new RegExp(emoteHelper.getRegExp(), 'g'),
    decoration: (match) => {
        return Decoration.replace({
            widget: new EmoteWidget(
                emoteHelper.getEmote(match[0])
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