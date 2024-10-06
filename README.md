# MapTransform

Map transform stream to be used with [stream-json](https://www.npmjs.com/package/stream-json). It can be used to transform values in large json. Basically a js map function but for streamed large json.

Expects a json which consists of an object as root. For each child property value, and item in array directly under root, it calls mapFn. 
The value will be replaced or kept depending in response from mapFn.

NOTE: Not suitable for when child objects are really large since the entire object is kept in 
memory when passed to mapFn.

## Example

```typescript
import { chain } from 'stream-chain';
import { parser } from 'stream-json';
import { MapTransform } from './map-transform';
import Asm from 'stream-json/Assembler';

const pipeline = chain([
    /*
        sample.json
        {
            "products": [{
                "id": 1,
                "title": "Product 1"
            }]
        }
    */
    fs.createReadStream('sample.json'),
    parser({ streamKeys: false, streamStrings: false, streamNumbers: false, streamValues: false }),
    new MapTransform<any>({
        mapFn: (value, path) => {
            if (path === 'products') {
                return {
                    action: 'replace', 
                    value: { 
                        id: value.id, 
                        title: value.title + '!' 
                    }
                };
            }
            else
                return { action: 'no action' };
        }
    })
]);

const asm = Asm.connectTo(pipeline);
asm.on('done', asm => {
    console.log(asm.current);
});

/* 
    Logs:
    {
        "products": [{
            "id": 1,
            "title": "Product 1!"
        }]
    } 
*/
```

## How it works

1. Reads data.json as a read stream
2. stream-json parses json into stream of tokens
3. Custom objectTransform maps part of json
4. Object parsed back into stream of tokens
5. stream-json stringer assembles tokens into writable stream
6. Writes to result.json

## How to run

```
npm install

npm test

npm run generate-data && npm run example
// Creates result.json
```


## Todo

- [X] Support property simple values
- [X] Support removing objects and properties
    - Objects in array can be removed by return undefined
    - Object properties can't be removed, use stream-json ignore filter to ignore them before passing to transform 