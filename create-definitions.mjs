import EPub from 'epub';
import { promises as fs } from 'fs';
import { JSDOM } from 'jsdom';
import 'dotenv/config';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function extractTextFromChapter(epub, chapterId) {
  return new Promise((resolve, reject) => {
    epub.getChapter(chapterId, (err, htmlContent) => {
      if (err) {
        reject(err);
        return;
      }
      const { document } = new JSDOM(htmlContent).window;
      const paragraphs = document.querySelectorAll('div');
      const text = Array.from(paragraphs).map((p) => p.textContent).join(' ');
      resolve(text);
    });
  });
}

async function getDefinitions(words, title, author) {
  const definitions = [];
  for (const word of words) {
    console.log(`Defining "${word}"`);
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4-1106-preview",
        temperature: 0.5,
        max_tokens: 512,
        top_p: 0.5,
        frequency_penalty: 0,
        presence_penalty: 0,
        messages: [
          {
            role: "system",
            content: `
              You are a function that takes a word and returns a terse single sentence definition that DOES NOT explain context, ONLY the meaning.
              The words are from the book "${title}" by ${author} and cannot be found in a dictionary.
              DO NOT use the word at the start of the definition.
              DO NOT use the name of the author, book or series.
              Use other languages like Greek or Latin or mythological, religious or historical references to determine the meaning of the word.
            `
          },
          {
            role: "user",
            content: `${word}`
          }
        ],
      });

      console.log('Definition: ',response.choices[0].message.content.trim());
      console.log('---');

      const lastMessage = response.choices[0].message.content.trim();
      definitions.push({
        word,
        definition: lastMessage
      });
    } catch (error) {
      console.error(`Error while trying to define the word "${word}":`, error);
    }
  }

  return definitions;
}

async function findUniqueWordsAndDefine(epubFile, wordsFile) {
  try {
    const epub = new EPub(epubFile);
    await new Promise((resolve, reject) => {
      epub.on('end', resolve);
      epub.on('error', reject);
      epub.parse();
    });

    const title = epub.metadata.title;
    const author = epub.metadata.creator;

    const chaptersText = await Promise.all(
      epub.flow.map((chapter) => extractTextFromChapter(epub, chapter.id))
    );
    const epubWords = new Set(
      chaptersText.join(' ').match(/\b(?![IVXLCDM]+\b)(?!\d+\b)([a-z]+(?:['-][a-z]+)?)\b/g) || []
    );

    const wordsText = await fs.readFile(wordsFile, 'utf-8');
    const wordsList = new Set(wordsText.toLowerCase().split(/\r?\n/));

    const uniqueWords = Array.from(epubWords).filter((word) => !wordsList.has(word));

    const wordsToDefine = uniqueWords.sort();
    const definitions = await getDefinitions(wordsToDefine, title, author);

    await fs.writeFile('definitions.json', JSON.stringify(definitions, null, 2), 'utf-8');

    console.log('Definitions saved to definitions.json');
  } catch (error) {
    console.error('Error processing files:', error);
  }
}

const [, , epubFile, wordsFile] = process.argv;

findUniqueWordsAndDefine(epubFile, wordsFile);
