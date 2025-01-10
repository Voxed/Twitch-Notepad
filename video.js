{
    const note = document.querySelector(".note")
    var prevRemovedCharCount = -1
    var firstSync = true;
    window.Twitch.ext.listen("broadcast", (target, contentType, message) => {
        const payload = JSON.parse(message)
        const scrollLock = firstSync || note.scrollTop >= note.scrollHeight - note.offsetHeight - 10
        firstSync = false;
        const removedCharCount = Math.max(0, parseInt(payload.charCount) - 4000)
        const removedCharDelta = removedCharCount - prevRemovedCharCount
        if (!scrollLock && removedCharDelta != 0) {
            console.log(removedCharDelta)
            // Make sure we keep at the same location in log when old lines are removed.
            // I hope this is compatible cross-browser, I hate it.
            const oldScrollTop = note.scrollTop
            const oldHeight = note.scrollHeight
            if (removedCharDelta > 0) {
                note.textContent = note.textContent.substring(removedCharDelta)
            } else if (removedCharDelta < 0) {
                // Characters were added at the top
                note.textContent = payload.note.substring(0, -removedCharDelta) + note.textContent
            }
            const newHeight = note.scrollHeight
            const removedHeight = oldHeight - newHeight
            console.log(removedHeight, newHeight)
            note.scrollTop = oldScrollTop - removedHeight
        }
        prevRemovedCharCount = removedCharCount
        note.textContent = payload.note;
        if (scrollLock)
            note.scrollTop = note.scrollHeight
    })
}