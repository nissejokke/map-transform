import fs from 'node:fs';

import { chain } from 'stream-chain';
import { parser } from 'stream-json';
import { stringer } from 'stream-json/Stringer';
import { transformObject } from '../transform';
import { ignore } from 'stream-json/filters/Ignore';

async function run() {
  let counter = 0;

  await new Promise((resolve, reject) => {
    const pipeline = chain([
      fs.createReadStream('example/data.json'),
      parser({ streamKeys: false, streamStrings: false, streamNumbers: false }),
      ignore({
        filter: /\bculture\b/i
      }),
      transformObject<any>({
        mapFn: (obj, path) => {
          if (path === 'categories')
            return {
              action: 'replace', value: { id: obj.id + '!', title: obj.title, description: 'Noo' }
            };
          else if (path === 'products') {
            // removes product with id 1
            if (obj.id === '1')
              return { action: 'replace', value: undefined };
            return { action: 'replace', value: { id: obj.id + ' ' + obj.id, title: obj.title } };
          }
          else
            return { action: 'keep' };
        }
      }),
      data => {
        counter++;
        console.log('->', data);
        return data;
      },
      stringer({ useValues: true }),
      // zlib.createGzip(),
      fs.createWriteStream('example/result.json'),
    ]);

    pipeline.on('end', resolve);
    pipeline.on('error', reject)
  })
  console.log('Pipeline succeeded. ', counter);
}

(async () => {
  await run();
})();