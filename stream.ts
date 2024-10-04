import fs from 'node:fs';

import { chain } from 'stream-chain';
import { parser } from 'stream-json';
import { stringer } from 'stream-json/Stringer';
import { transform } from './transform';

async function run() {
  let counter = 0;

  await new Promise((resolve, reject) => {
    const pipeline = chain([
      fs.createReadStream('data.json'),
      parser({ streamKeys: false, streamStrings: false, streamNumbers: false }),
      transform<any>({
        mapFn: (obj, path) => {
          if (path === 'categories')
            return { id: obj.id + '!', title: obj.title, description: 'Noo' };
          else if (path === 'products')
            return { id: obj.id + ' ' + obj.id, title: obj.title };
        }
      }),
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