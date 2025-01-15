window.notepadSettings = {
    fontSize: 22
}

{
    const defaultSettings = {
        "fontSize": 22,
        "backgroundColor": "#272727"
    }

    const button = document.querySelector(".settings-button")
    const settings = document.querySelector(".settings-panel")
    const note = document.querySelector(".note")
    const body = document.querySelector("body")
    const fontSize = document.querySelector("#settings-font-size")
    const bgColor = document.querySelector("#settings-bg")
    const defaultOption = document.querySelector("#settings-default")
    const acceptCookies = document.querySelector(".settings-option-button.settings-option-accept-cookies")
    let useCookies = localStorage.getItem("acceptedCookies") === "true";

    function enableCookies() {
        localStorage.setItem("acceptedCookies", "true");
        useCookies = true
        settings.classList.add("cookies-allowed")
        setFontSize(localStorage.getItem("fontSize"))
        setBackgroundColor(localStorage.getItem("backgroundColor"))
    }

    function fgColor(hex) {
        const r = parseInt(hex.substr(1, 2), 16)
        const g = parseInt(hex.substr(3, 2), 16)
        const b = parseInt(hex.substr(5, 2), 16)
        const flipYs = 0.342
        const trc = 2.4, Rco = 0.2126729, Gco = 0.7151522, Bco = 0.0721750
        let Ys = (r / 255.0) ** trc * Rco + (g / 255.0) ** trc * Gco + (b / 255.0) ** trc * Bco
        return Ys < flipYs ? 'white' : 'black'
    }

    function setBackgroundColor(color) {
        color = color || defaultSettings.backgroundColor
        body.style.backgroundColor = color;
        const fg = fgColor(color)
        note.style.color = fg
        bgColor.value = color
        if (useCookies)
            localStorage.setItem("backgroundColor", color)
    }

    function setFontSize(size) {
        size = size || defaultSettings.fontSize
        note.style.fontSize = size + "px"
        fontSize.value = size
        document.querySelectorAll('.emote').forEach(e => {
            e.height = size
            e.width = size * parseFloat(e.dataset.ratio)
        })
        window.notepadSettings.fontSize = size
        if (useCookies)
            localStorage.setItem("fontSize", size)
    }

    function resetDefaults() {
        setFontSize(null)
        setBackgroundColor(null)
    }

    button.addEventListener("click", () => {
        settings.classList.toggle("settings-shown");
    })

    fontSize.addEventListener("change", () => {
        setFontSize(fontSize.value)
    })

    bgColor.addEventListener("input", () => {
        setBackgroundColor(bgColor.value)
    })

    defaultOption.addEventListener("click", resetDefaults)

    if (!useCookies) {
        acceptCookies.addEventListener("click", enableCookies)
    } else {
        enableCookies()
    }

    // Prevent user from accidentally reloading extension by pressing enter 
    // and submitting the form
    settings.addEventListener("keypress", (e) => {
        var key = e.charCode || e.keyCode || 0;
        if (key == 13) {
            e.preventDefault();
        }
    })
}