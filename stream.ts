import { pipeline } from 'node:stream/promises';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { Transform, Readable } from 'node:stream';

import { chain } from 'stream-chain';
import { parser } from 'stream-json';
import { pick } from 'stream-json/filters/Pick';
import { ignore } from 'stream-json/filters/Ignore';
import { streamValues } from 'stream-json/streamers/StreamValues';
import { streamArray } from 'stream-json/streamers/StreamArray';
import { streamObject } from 'stream-json/streamers/StreamObject';
import { stringer } from 'stream-json/Stringer';
import { emitter } from 'stream-json/Emitter';
import { disassembler } from 'stream-json/Disassembler';
import Asm from 'stream-json/Assembler';
import { JsonStreamType } from './types';
import { assembleArrayStream, dissambleObjectIntoStream } from './parse';

async function run() {
  let counter = 0;
  await new Promise((resolve, reject) => {

    let buffer: JsonStreamType[] = [];
    let objectDepth = 0;
    let recordMode = false;
    let pushedToBuffer = false;
    let prev: JsonStreamType[] = [];
    const testStream = new Transform({
      objectMode: true,
      async transform(chunk: JsonStreamType, encoding, callback) {
        pushedToBuffer = false;
        if (chunk.name === 'startObject') objectDepth++;
        if (chunk.name === 'endObject') objectDepth--;

        prev.unshift(chunk);
        while (prev.length > 3)
          prev.pop();

        if (!recordMode) {
          if (chunk.name === 'startArray' && prev[1].name === 'keyValue' && prev[1].value === 'categories') {
            recordMode = true;
          }
          callback(null, chunk);
        }
        else {
          if (chunk.name === 'endObject' && objectDepth === 1) {
            recordMode = false;
          }

          buffer.push(chunk);
          pushedToBuffer = true;

          if (!recordMode && buffer.length) {
            console.log('yey we got an object');
            console.log(buffer);

            const obj = await assembleArrayStream<{ id: string, title: string }>(buffer);
            buffer = await dissambleObjectIntoStream({ id: obj.id + ' 2', title: obj.title });

            callback(null, buffer);
            buffer = [];
          }
          else  
            callback(null);
        }

      },
    });

    const pipeline = chain([
      fs.createReadStream('data.json'),
      parser({ streamKeys: false, streamStrings: false, streamNumbers: false }),
      testStream,
      data => {
        counter++;
        console.log('->', data);
        return data;
      },
      stringer({ useValues: true }),
      // zlib.createGzip(),
      fs.createWriteStream('result.json'),
    ]);

    pipeline.on('end', resolve);
    pipeline.on('error', reject)
  })
  console.log('Pipeline succeeded. ', counter);
}

(async () => {

  await run();
})();