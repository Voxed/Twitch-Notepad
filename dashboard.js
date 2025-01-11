{

    /**
        * Get 7TV user by a connected platform account.
        * @param {string} platform - e.g. "TWITCH", "YOUTUBE", "KICK", "TROVO".
        * @param {string} connectionId - The user ID on that platform.
        * @returns {Promise<Object|null>} The 7TV user object, or null if not found/error.
        */
    async function getUserByConnection(platform, connectionId) {
        const query = `
      query GetUserByConnection($platform: String!, $id: String!) {
        userByConnection(platform: $platform, id: $id) {
          id
          display_name
          emote_sets {
             id
             name
             emotes {
                id
                name
            }
          }
        }
      }
    `;

        const variables = { platform: platform, id: connectionId };

        try {
            const response = await fetch('https://7tv.io/v3/gql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, variables }),
            });

            const json = await response.json();
            console.log(json)
            if (json.errors) {
                console.error('7TV GraphQL errors:', json.errors);
                return null;
            }

            // If user wasn't found, userByConnection could be null
            return json.data?.userByConnection ?? null;
        } catch (err) {
            console.error('Network/Fetch error:', err);
            return null;
        }
    }

    async function getUserActiveEmotes(userId) {
        const query = `
query Users($userId: Id!) {
  users {
    user(id: $userId) {
      style {
        activeEmoteSet {
          emotes {
            items {
              alias
              emote {
                images {
                  height
                  width
                  url
                  scale
                  mime
                  size
                  frameCount
                }
                defaultName
                flags {
                  animated
                }
              }
            }
          }
        }
      }
    }
  }
}`;

        const variables = { userId };

        try {
            const response = await fetch('https://7tv.io/v4/gql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, variables }),
            });

            const json = await response.json();
            if (json.errors) {
                console.error('7TV GraphQL errors:', json.errors);
                return null;
            }

            // If user wasn't found, userByConnection could be null
            return json.data.users.user.style.activeEmoteSet.emotes.items;
        } catch (err) {
            console.error('Network/Fetch error:', err);
            return null;
        }
    }


    window.Twitch.ext.onAuthorized(async (auth) => {

        console.log({ 'Content-Type': 'application/json', 'client-id': auth.clientId, 'Authorization': 'Extension ' + auth.helixToken})


        async function apiRequest(endpoint){
            const response = await fetch('https://api.twitch.tv/helix/' + endpoint, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json', 'client-id': auth.clientId, 'Authorization': 'Extension ' + auth.helixToken}
            });
            return await response.json()
        }

        emilya_channel_id = (await apiRequest('users?login=emilya')).data[0].id
        twemotes = (await apiRequest('chat/emotes?broadcaster_id=' + emilya_channel_id))
        twglobalemotes = (await apiRequest('chat/emotes/global'))
        stvid = (await getUserByConnection('TWITCH', emilya_channel_id)).id

        stvemotes = await getUserActiveEmotes(stvid)

        bttvemotes = await (await fetch("https://api.betterttv.net/3/cached/emotes/global")).json()
        console.log('bttv', bttvemotes)

        emotes = {}
        {
            for (emoteCont of stvemotes) {
                const emote = emoteCont.emote
                const name = emote.defaultName
                const images = emote.images
                let image = images[0].url
                let resolution = []
                for(i of images) {
                    if(i.scale == 4 && i.mime == "image/avif" && (!emote.flags.animated || i.frameCount > 1 )) {
                        resolution = [i.width, i.height]
                        image = i.url
                    }
                }
                emotes[emoteCont.alias] = {url: image, resolution}
            }
            for(emote of twemotes.data) {
                emotes[emote.name] = {url: emote.images.url_4x, resolution: [32, 32]}
            }
            for(emote of twglobalemotes.data) {
                // disable smilies because they are non-standard size and will look weird
                if(!['R)', ';P', ':P', ';)', ':/', '<3', ':O', 'B)', 'O_o', ':|', '>(', ':D', ':(', ':)'].includes(emote.name))
                    emotes[emote.name] = {url: emote.images.url_4x, resolution: [32, 32]}
            }
            for(emote of bttvemotes) {
                // some are non standard size but they don't list it so nothing i can do about that
                emotes[emote.code] = {url: `https://cdn.betterttv.net/emote/${emote.id}/3x.webp`, resolution: [32, 32]}
            }
        }


        let note = document.querySelector(".note");
        setInterval(() => {
            //let charCount = note.value.length
            /*window.Twitch.ext.send("broadcast", "application/json", JSON.stringify({
                "charCount": charCount,
                "note": note.value.slice(-4000)
            }))*/
        }, 1000) // This value MUST be more than 60000 / 100 = 600 otherwise you will get rate 
        // limited

        // This is a code hack which ensures that there is a padding underneath the caret when
        // moving it initiates a scroll. That's how it works in notepad
        // Tested on Firefox and Chrome
        {
            const scrollPadding = 20
            let selectionTimeout = 0
            let oldSelection = 0
            note.addEventListener("scroll", (e) => {
                if (note.selectionStart != oldSelection)
                    note.scrollTop += scrollPadding * Math.sign(note.selectionStart - oldSelection)
                oldSelection = note.selectionStart
            })
            note.addEventListener("selectionchange", (e) => {
                clearTimeout(selectionTimeout)
                selectionTimeout = setTimeout(() => {
                    oldSelection = note.selectionStart
                }, 100)
            })
        }

        function onInput(e, paste = false, destroyEmote = false) {
            /**
             * This is the emote destruction code, (and text segment merging).
             * It handles a lot of edgecases so it's pretty complex, but it's still very WIP, hopefully it gets better.
             */
            {
                const selection = window.getSelection();
                const range = selection.getRangeAt(0);
                let rest = range.startContainer
                let restOffset = range.startOffset

                /**
                 * Sometimes the caret will oddly be located inbetween two elements.
                 * If this is the case startContainer will be the note element.
                 * In this case, move the selection to the next element and set the offset to 0.
                 */
                if (rest === note) {
                    rest = note.childNodes[restOffset]
                    restOffset = 0
                    if (rest === undefined) {
                        rest = new Text('')
                        note.appendChild(rest)
                    }
                }

                let i = Math.max(0, Array.from(note.childNodes).indexOf(rest) - 1)
                while (true) {
                    if (note.childNodes.length <= i)
                        break;
                    const elem = note.childNodes[i]
                    if (elem.tagName == "BR") {
                        /**
                         * Sometimes when pasting data, firefox (maybe others) stupidly inserts BR instead of \n
                         * Let's destroy them
                         */
                        if (elem === rest) {
                            const text = new Text('\n')
                            rest = text
                            note.insertBefore(text, elem)
                        }
                        elem.remove()

                    } else if (elem.nextSibling != null && elem.nextSibling.tagName == "BR") {
                        /**
                         * If the BR is located to the right of a text element we wan't to destroy it before 
                         * executing logic for the element.
                         */
                        note.insertBefore(new Text('\n'), elem.nextSibling)
                        if (rest === elem.nextSibling.nextSibling)
                            rest = elem.nextSibling
                        elem.nextSibling.nextSibling.remove()

                    } else if (elem instanceof Text) {
                        /**
                         * The current element is a text
                         */
                        if (elem.nextSibling instanceof Text) {
                            /**
                             * The next element is a text, merge the two elements
                             */
                            if (rest == elem.nextSibling) {
                                rest = elem
                                restOffset = restOffset + elem.data.length
                            }
                            elem.data = elem.data + elem.nextSibling.data
                            elem.nextSibling.remove()

                        } else if (elem.nextSibling instanceof Image &&
                            elem.data.length > 0 && elem.data.slice(-1) !== ' ' && elem.data.slice(-1) !== '\n'
                        ) {
                            /**
                             * The next element is an emote 
                             * AND there is no space/newline before it
                             */
                            elem.data = elem.data + elem.nextSibling.alt
                            elem.nextSibling.remove()

                        } else if (elem.previousSibling instanceof Image && (
                            (destroyEmote && elem == rest && restOffset == 0) ||
                            (elem.data.length > 0 && elem.data[0] !== ' ' && elem.data[0] !== '\n')
                        )) {
                            /**
                             * The previous element is an emote
                             * AND there is no space/newline after it.
                             * OR onInput has been fed the destroyEmote argument from beforeinput below
                             */
                            if (rest == elem || destroyEmote) {
                                rest = elem
                                restOffset = restOffset + elem.previousSibling.alt.length
                            }
                            elem.data = elem.previousSibling.alt + elem.data
                            elem.previousSibling.remove()
                            i -= 1
                        } else {
                            i += 1
                        }

                    } else if (elem instanceof Image && elem.nextSibling instanceof Image) {
                        /**
                         * The current and the next element is an emote.
                         * Two emotes are right next to eachother, destroy them both and create a merged text 
                         */
                        const text = new Text(elem.alt + elem.nextSibling.alt)
                        note.insertBefore(text, elem)
                        if (elem.nextSibling == rest) {
                            rest = text
                            restOffset = elem.alt.length
                        }
                        elem.nextSibling.remove()
                        elem.remove()
                    } else {
                        i += 1
                    }
                }
                window.getSelection().removeAllRanges()
                let r = document.createRange()
                r.setStart(rest, restOffset)
                r.setEnd(rest, restOffset)
                window.getSelection().addRange(r)
            }

            function escapeRegExp(text) {
                return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
            }

            /**
             * This is the emote creation code. It's relatively simple (relative in comparison to the destruction code lmao). (still WIP)
             */
            {
                const selection = window.getSelection();
                const range = selection.getRangeAt(0);
                let rest = range.startContainer
                let restOffset = range.startOffset
                while (true) {
                    let nextEmoteIndex = 999999999999999
                    let e = null
                    for (em in emotes) {
                        let index = rest.data.search(`(?<=^|[\n ])${escapeRegExp(em)}(?=[\n ]|$)`)
                        if (index != -1) {
                            if (nextEmoteIndex > index) {
                                nextEmoteIndex = index
                                e = em
                            }
                        }
                    }
                    if (e == null) break
                    {
                        const newRest = new Text(rest.data.substring(nextEmoteIndex + e.length))
                        let newOffset = restOffset - (nextEmoteIndex + e.length)
                        let emote = new Text(e)
                        if (newOffset > 0 || newOffset <= -e.length) {
                            em = emotes[e]
                            const ratio = (em.resolution[0]/em.resolution[1])
                            emote = new Image(ratio*window.notepadSettings.fontSize, window.notepadSettings.fontSize)
                            emote.dataset.ratio = ratio
                            emote.classList.add('emote')
                            emote.alt = e
                            emote.src = em.url
                        } else {
                            break
                        }
                        rest.data = rest.data.substring(0, nextEmoteIndex);
                        if (rest.nextSibling == null) {
                            note.appendChild(emote)
                            note.appendChild(newRest)
                        } else {
                            const next = rest.nextSibling
                            note.insertBefore(emote, next)
                            note.insertBefore(newRest, next)
                        }
                        if (newOffset < 0) {
                            newOffset = restOffset
                        } else {
                            rest = newRest
                            restOffset = newOffset
                        }
                        emotesAdded = true
                    }
                }

                window.getSelection().removeAllRanges()
                let r = document.createRange()
                r.setStart(rest, restOffset)
                r.setEnd(rest, restOffset)
                window.getSelection().addRange(r)
            }
        }

        note.addEventListener("input", onInput)

        note.addEventListener("beforeinput", (e) => {
            if (e.inputType == 'deleteContentBackward') {
                const selection = window.getSelection();
                const range = selection.getRangeAt(0);
                let rest = range.startContainer
                let restOffset = range.startOffset
                let multiSelect = range.startContainer != range.endContainer || range.startOffset != range.endOffset
                if (!multiSelect && (restOffset == 0 || (rest == note && note.childNodes[restOffset - 1] instanceof Image))) {
                    onInput(null, false, true)
                    e.preventDefault()
                }
            }
        })

        note.addEventListener('paste', function (e) {
            e.preventDefault()
            paste = true;

            let p = (event.clipboardData || window.clipboardData).getData('text');

            const selection = window.getSelection();
            if (!selection.rangeCount) return false;
            selection.deleteFromDocument();
            const node = document.createTextNode(p)
            selection.getRangeAt(0).insertNode(node);


            window.getSelection().removeAllRanges()
            let r = document.createRange()
            r.setStart(node, node.data.length)
            r.setEnd(node, node.data.length)
            window.getSelection().addRange(r)

            onInput(null, true, false)

            event.preventDefault();

        })

        note.addEventListener("dragstart", (e) => {
            const plainText = e.dataTransfer.getData('text')
            e.dataTransfer.clearData()
            e.dataTransfer.setData('text', plainText)
        });
    })
}