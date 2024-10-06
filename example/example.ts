import fs from 'node:fs';
import { memoryUsage } from 'process';

import { chain } from 'stream-chain';
import { parser } from 'stream-json';
import { stringer } from 'stream-json/Stringer';
import { ignore } from 'stream-json/filters/Ignore';

import { MapTransform } from '../map-transform';

async function run() {
  let counter = 0;

  await new Promise((resolve, reject) => {
    const pipeline = chain([
      fs.createReadStream('example/data.json'),
      parser({ streamKeys: false, streamStrings: false, streamNumbers: false, streamValues: false }),
      ignore({
        filter: /\bculture\b/i
      }),
      new MapTransform<any>({
        mapFn: (value, path) => {
          if (path === 'categories')
            return {
              action: 'replace', value: { id: value.id + '!', title: value.title, description: 'Noo' }
            };
          else if (path === 'products') {
            // removes product with id 1
            if (value.id === '1')
              return { action: 'replace', value: undefined };
            return { action: 'replace', value: { id: value.id + ' ' + value.id, title: value.title } };
          }
          else if (path === 'version') {
            return { action: 'replace', value: value + 1 };
          } else
            return { action: 'no action' };
        }
      }),
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
  // const interval = setInterval(() => {
  //   for (const [key,value] of Object.entries(memoryUsage())){
  //     console.log(`Memory usage by ${key}, ${value/1000000}MB `)
  //   }
  //   console.log();
  // }, 100);

  await run();
  // clearInterval(interval);
})();