import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { promises as fs } from 'fs';

async function createOPFFile(title = 'Dictionary', author = 'Anonymous') {
  const bookId = uuidv4();
  const outputDir = './output';

  const opfContent = `<?xml version="1.0"?>
<package version="2.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="${bookId}">
  <metadata>
    <dc:title>${title}</dc:title>
    <dc:creator opf:role="aut">${author}</dc:creator>
    <dc:language>en-us</dc:language>
    <x-metadata>
      <DictionaryInLanguage>en-us</DictionaryInLanguage>
      <DictionaryOutLanguage>en-us</DictionaryOutLanguage>
      <DefaultLookupIndex>default</DefaultLookupIndex>
    </x-metadata>
  </metadata>
  <manifest>
    <item id="cover" href="cover.html" media-type="application/xhtml+xml" />
    <item id="copyright" href="copyright.html" media-type="application/xhtml+xml" />
    <item id="content" href="content.html" media-type="application/xhtml+xml" />
  </manifest>
  <spine>
    <itemref idref="cover" />
    <itemref idref="copyright"/>
    <itemref idref="content"/>
  </spine>
  <guide>
    <reference type="index" title="IndexName" href="content.html"/>
  </guide>
</package>`;

  const coverContent = `<html>
  <head>
    <meta content="text/html" http-equiv="content-type">
  </head>
  <body>
    <h1>${title}</h1>
    <h2><em>${author}</em></h2>
  </body>
</html>`;

  const copyrightContent = `<html>
  <head>
    <meta content="text/html" http-equiv="content-type">
  </head>
  <body>
    <h1>Copyright</h1>
    <p>This work is dedicated to the public domain. Anyone is free to copy, modify, publish, use, compile, sell, or distribute this work, for any purpose, commercial or non-commercial, and by any means.</p>
  </body>
</html>`;

  // Read and parse definitions.json
  const definitionsPath = './definitions.json';
  let definitions = [];
  try {
    const definitionsContent = await fs.readFile(definitionsPath, 'utf-8');
    definitions = JSON.parse(definitionsContent);
  } catch (err) {
    console.error(`Error reading definitions file: ${err}`);
    return;
  }

  // Generate content for each definition
  const contentEntries = definitions.map(def => {
    return `
      <idx:entry name="default" scriptable="yes" spell="yes">
        <dt>
          <idx:orth>${def.word}</idx:orth>
        </dt><br />
        <dd>${def.definition}</dd>
      </idx:entry>
      <br /><hr />`;
  }).join('');

  const contentContent = `<html xmlns:math="http://exslt.org/math" xmlns:svg="http://www.w3.org/2000/svg"
    xmlns:tl="https://kindlegen.s3.amazonaws.com/AmazonKindlePublishingGuidelines.pdf"
    xmlns:saxon="http://saxon.sf.net/" xmlns:xs="http://www.w3.org/2001/XMLSchema"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:cx="https://kindlegen.s3.amazonaws.com/AmazonKindlePublishingGuidelines.pdf"
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:mbp="https://kindlegen.s3.amazonaws.com/AmazonKindlePublishingGuidelines.pdf"
    xmlns:mmc="https://kindlegen.s3.amazonaws.com/AmazonKindlePublishingGuidelines.pdf"
    xmlns:idx="https://kindlegen.s3.amazonaws.com/AmazonKindlePublishingGuidelines.pdf">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <style>
      dt {
        font-weight: bold;
      }
    </style>
  </head>
  <body>
    <mbp:frameset>${contentEntries}</mbp:frameset>
  </body>
</html>`;

  if (!existsSync(outputDir)) {
    try {
      await mkdir(outputDir);
    } catch (err) {
      console.error('Error creating output directory:', err);
      return;
    }
  }

  try {
    await writeFile('./output/dictionary.opf', opfContent);
    await writeFile('./output/cover.html', coverContent);
    await writeFile('./output/copyright.html', copyrightContent);
    await writeFile('./output/content.html', contentContent);
    console.log('Files have been written successfully');
  } catch (err) {
    console.error('Error writing files:', err);
  }
}

const [,, title, author] = process.argv;

createOPFFile(title, author);
