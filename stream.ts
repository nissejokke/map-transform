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
import { assembleArrayStream, dissambleObjectIntoStream } from './conversions';
import { transform } from './transform';

async function run() {
  let counter = 0;
  await new Promise((resolve, reject) => {

    const pipeline = chain([
      fs.createReadStream('data.json'),
      parser({ streamKeys: false, streamStrings: false, streamNumbers: false }),
      transform(),
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