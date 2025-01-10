var note = document.querySelector(".note");
setInterval(() => {
    var charCount = note.value.length
    window.Twitch.ext.send("broadcast", "application/json", JSON.stringify({
        "charCount": charCount,
        "note": note.value.slice(-4000)
    }))
}, 500)