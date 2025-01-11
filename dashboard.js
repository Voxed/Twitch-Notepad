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


    (async (auth) => {

        emotes = {}
        {
            let response = await getUserByConnection('TWITCH', '')
            for(set of response.emote_sets) {
                for(emote of set.emotes) {
                    emotes[emote.name] = `https://cdn.7tv.app/emote/${emote.id}/1x.avif`
                }
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

        function onInput(e, paste = false) {
            let shouldCreateEmotes = true
            {
                const selection = window.getSelection();
                const range = selection.getRangeAt(0);
                let rest = range.startContainer
                let restOffset = range.startOffset

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
                        if (elem === rest) {
                            const text = new Text('')
                            rest = text
                            note.insertBefore(text, elem)
                        }
                        elem.remove()
                    } else if (elem.nextSibling != null && elem.nextSibling.tagName == "BR") {
                        note.insertBefore(new Text('\n'), elem.nextSibling)
                        if (rest === elem.nextSibling.nextSibling)
                            rest = elem.nextSibling
                        elem.nextSibling.nextSibling.remove()
                    } else if (elem instanceof Text) {
                        if (elem.nextSibling instanceof Text) {
                            if (rest == elem.nextSibling) {
                                rest = elem
                                restOffset = restOffset + elem.data.length
                            }
                            elem.data = elem.data + elem.nextSibling.data
                            elem.nextSibling.remove()
                        } else if (elem.nextSibling instanceof Image && elem.data.length > 0 && elem.data.slice(-1) !== ' ' && elem.data.slice(-1) !== '\n') {
                            elem.data = elem.data + elem.nextSibling.alt
                            elem.nextSibling.remove()
                        } else if (elem.previousSibling instanceof Image && ((restOffset == 0 || rest == elem) || (elem.data.length > 0 && elem.data[0] !== ' ' && elem.data[0] !== '\n'))) {
                            if (rest == elem) {
                                restOffset = restOffset + elem.previousSibling.alt.length
                            }
                            elem.data = elem.previousSibling.alt + elem.data
                            elem.previousSibling.remove()
                            i -= 1
                        } else {
                            i += 1
                        }
                    } else if (elem instanceof Image && elem.nextSibling instanceof Image) {
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

            {
                const selection = window.getSelection();
                const range = selection.getRangeAt(0);
                let rest = range.startContainer
                let restOffset = range.startOffset
                while (true) {
                    let nextEmoteIndex = 999999999999999
                    let e = null
                    for (em in emotes) {
                        let index = rest.data.search(`(?<=^|[\n ])${em}(?=[\n ]|$)`)
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
                        if (newOffset != 0) {
                            emote = new Image(32, 32)
                            emote.alt = e
                            emote.src = emotes[e]
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

                    // merge emotes text and text
                }

                window.getSelection().removeAllRanges()
                let r = document.createRange()
                r.setStart(rest, restOffset)
                r.setEnd(rest, restOffset)
                window.getSelection().addRange(r)
            }

            //console.log(text.substring(0, offset - 1).split(/[\n ]+/))
            /*note.innerHTML = note.innerHTML.replace('aga', 'hey')
             selection.removeAllRanges()
             console.log(range)
             const r2 = document.createRange();
             console.log(start)
             r2.setStart(note,1)
             r2.setEnd(note,1);
             console.log(r2)
             window.getSelection().addRange(r2)*/
        }

        note.addEventListener("input", onInput)

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

            onInput(null, true)

            event.preventDefault();

        })

        note.addEventListener("dragstart", (e) => {
            const plainText = e.dataTransfer.getData('text')
            e.dataTransfer.clearData()
            e.dataTransfer.setData('text', plainText)
        });
    })()
}