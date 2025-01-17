import fs from 'fs'
import archiver from 'archiver'

const archive = archiver('zip')
const output = fs.createWriteStream('Notepad-Twitch.zip')

archive.pipe(output)

output.on('close', () => console.log("Extension written to " + output.path + "!"))
archive.on('error', (err) => { throw err })

archive.directory('out', false)

archive.finalize()