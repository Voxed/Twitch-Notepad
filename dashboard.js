{
    let note = document.querySelector(".note");
    setInterval(() => {
        let charCount = note.value.length
        window.Twitch.ext.send("broadcast", "application/json", JSON.stringify({
            "charCount": charCount,
            "note": note.value.slice(-4000)
        }))
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
            if(note.selectionStart != oldSelection)
                note.scrollTop += scrollPadding*Math.sign(note.selectionStart - oldSelection)
            oldSelection = note.selectionStart
        })
        note.addEventListener("selectionchange", (e) => {
            clearTimeout(selectionTimeout)
            selectionTimeout = setTimeout(() => {
                oldSelection = note.selectionStart
            }, 100)
        })
    }
}