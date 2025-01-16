import { resolve } from 'path';
import { createHash } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';
import { globSync } from 'glob';

// pretend we are in a production build
// process.env.NODE_ENV = 'production';

const basePath = '/'
const distDir = 'out'

{
    const MAGIC_STRING = '__this_is_a_placeholder_for_the_inline_scripts__';

    console.log('grab all the html files');
    const baseDir = resolve(distDir.replace(/^\//, ''));
    const htmlFiles = globSync(`${baseDir}/**/*.html`);
    console.log(htmlFiles,)
    if (true) {
        htmlFiles.forEach((file: string) => {
            // grab inline scripts from each html file
            const contents = readFileSync(file).toString();
            const scripts: string[] = [];
            const newFile = contents.replace(/<script>((.|\n)+?)<\/script>/g, (_, data) => {
                const addMagicString = scripts.length === 0;
                scripts.push(`${data}${data.endsWith(';') ? '' : ';'}`);
                return addMagicString ? MAGIC_STRING : '';
            });

            // early exit if we have no inline scripts
            if (!scripts.length) {
                return;
            }
            console.log(`processing ${file}`);

            // combine all the inline scripts, add a hash, and reference the new file
            console.log('\trewriting');
            const chunk = scripts.join('');
            const hash = createHash('md5').update(chunk).digest('hex');
            writeFileSync(`${baseDir}/assets/chunk.${hash}.js`, chunk);
            writeFileSync(
                file,
                newFile.replace(
                    MAGIC_STRING,
                    `<script src="${basePath}${basePath.endsWith('/') ? '' : '/'
                    }assets/chunk.${hash}.js" crossorigin=""></script>`
                )
            );
            console.log('\tfinished');
        });

        htmlFiles.forEach((file: string) => {
            // grab inline scripts from each html file
            const contents = readFileSync(file).toString();
            const scripts: string[] = [];
            const newFile = contents.replace(/<script data-mantine-script="true">((.|\n)+?)<\/script>/g, (_, data) => {
                const addMagicString = scripts.length === 0;
                scripts.push(`${data}${data.endsWith(';') ? '' : ';'}`);
                return addMagicString ? MAGIC_STRING : '';
            });

            // early exit if we have no inline scripts
            if (!scripts.length) {
                return;
            }
            console.log(`processing ${file}`);

            // combine all the inline scripts, add a hash, and reference the new file
            console.log('\trewriting');
            const chunk = scripts.join('');
            const hash = createHash('md5').update(chunk).digest('hex');
            writeFileSync(`${baseDir}/assets/chunk.${hash}.js`, chunk);
            writeFileSync(
                file,
                newFile.replace(
                    MAGIC_STRING,
                    `<script data-mantine-script="true" src="${basePath}${basePath.endsWith('/') ? '' : '/'
                    }assets/chunk.${hash}.js" crossorigin=""></script>`
                )
            );
            console.log('\tfinished');
        });

        htmlFiles.forEach((file: string) => {
            const contents = readFileSync(file).toString();
            console.log('\trewriting');
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
            console.log('\tfinished');
        });

        const jsFiles = globSync(`${baseDir}/**/*.js`);
        jsFiles.forEach((file: string) => {
            const contents = readFileSync(file).toString();
            if (contents.includes('/_next/')) {
                console.log('\trewriting');
                writeFileSync(
                    file,
                    contents.replaceAll(
                        '/_next/',
                        '_next/'
                    )
                );
                console.log('\tfinished');
            }
        });
    }
}