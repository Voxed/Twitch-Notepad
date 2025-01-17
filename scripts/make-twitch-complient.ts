import { createHash } from 'crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'fs';
import { globSync } from 'glob';
import path from 'node:path';

// Config
const distDir = 'out'
const assetDir = 'assets'

console.log("Making app complient with Twitch extension content policies...")
const assetPath = path.join(distDir, assetDir)
if (!existsSync(assetPath))
    mkdirSync(assetPath)

const MAGIC_STRING = '__this_is_a_placeholder_for_the_inline_scripts__';

console.log('\tExtracting inline <script></script>...');
const baseDir = path.resolve(distDir);
const htmlFiles = globSync(`${baseDir}/*.html`);
htmlFiles.forEach((file: string) => {
    const contents = readFileSync(file).toString();
    const scripts: string[] = [];
    const newFile = contents.replace(/<script>((.|\n)+?)<\/script>/g, (_, data) => {
        const addMagicString = scripts.length === 0;
        scripts.push(`${data}${data.endsWith(';') ? '' : ';'}`);
        return addMagicString ? MAGIC_STRING : '';
    });

    if (!scripts.length) {
        return;
    }
    console.log(`\t\tExtracting from ${file}...`);

    const chunk = scripts.join('');
    const hash = createHash('md5').update(chunk).digest('hex');
    const scriptName = `chunk.${hash}.js`
    const scriptPath = path.join(assetPath, scriptName)
    writeFileSync(scriptPath, chunk);
    writeFileSync(
        file,
        newFile.replace(
            MAGIC_STRING,
            `<script src="${path.join(assetDir, scriptName)}" crossorigin=""></script>`
        )
    );
    console.log(`\t\t\t...scripts written to ${scriptPath}!`)
});
console.log("\t...done!")

console.log('\tExtracting inline <script data-mantine-script="true"></script>...');
htmlFiles.forEach((file: string) => {
    const contents = readFileSync(file).toString();
    const scripts: string[] = [];
    const newFile = contents.replace(/<script data-mantine-script="true">((.|\n)+?)<\/script>/g, (_, data) => {
        const addMagicString = scripts.length === 0;
        scripts.push(`${data}${data.endsWith(';') ? '' : ';'}`);
        return addMagicString ? MAGIC_STRING : '';
    });

    if (!scripts.length)
        return;
    console.log(`\t\tExtracting from ${file}...`);

    const chunk = scripts.join('');
    const hash = createHash('md5').update(chunk).digest('hex');
    const scriptName = `chunk.${hash}.js`
    const scriptPath = path.join(assetPath, scriptName)
    writeFileSync(scriptPath, chunk);
    writeFileSync(
        file,
        newFile.replace(
            MAGIC_STRING,
            `<script data-mantine-script="true" src="${path.join(assetDir, scriptName)}" crossorigin=""></script>`
        )
    );
    console.log(`\t\t\t...scripts written to ${scriptPath}!`)
});
console.log("\t...done!")

console.log("\tMaking asset paths relative...")
htmlFiles.forEach((file: string) => {
    const contents = readFileSync(file).toString();
    if(!contents.includes('src="/') && !contents.includes('href="/'))
        return;
    console.log(`\t\tConverting paths in ${file}...`)
    writeFileSync(
        file,
        contents.replaceAll(
            'src="/',
            'src="'
        ).replaceAll(
            'href="/',
            'href="'
        )
    );
    console.log(`\t\t\t...paths converted!`)
});
console.log("\t...done!")

console.log("\tMaking nextjs asset fetches relative...")
const jsFiles = globSync(`${baseDir}/**/*.js`);
jsFiles.forEach((file: string) => {
    const contents = readFileSync(file).toString();
    if (contents.includes('/_next/')) {
        console.log(`\t\tConverting fetches in ${file}...`)
        writeFileSync(
            file,
            contents.replaceAll(
                '/_next/',
                '_next/'
            )
        );
        console.log('\t\t\t...fetches converted!');
    }
});
console.log("\t...done!")

if(existsSync(path.join(distDir, '404.html'))) {
    console.log("\tRemoving 404.html...")
    rmSync(path.join(distDir, '404.html'))
    console.log("\t...done!")
}

const txtFiles = globSync(`${baseDir}/*.txt`);
if(txtFiles.length !== 0) {
    console.log("\tRemoving txt files...")
    txtFiles.forEach((f) => {
        console.log(`\tRemoving ${f}...`)
        rmSync(f)
        console.log(`\t\t...${f} removed!`)
    })
    console.log("\t...done!")
}

console.log("...done!")