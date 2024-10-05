# transformObject (custom stream-json transform stream)

 Transform stream to be used with [stream-json](https://www.npmjs.com/package/stream-json). It can be used to transform objects in large json. Basically a js map function but for streamed large json.

 Expects a json which consists of an object as root. For each child object it calls mapFn. Also for objects in arrays where the array is a direct child to the root.
 The object with be replaced or kept depending in response from mapFn.
 NOTE: Not suitable for when child objects are really large since the entire object is kept in 
 memory when passed to mapFn.

## How it works

1. Reads data.json as a read stream
2. stream-json parses json into stream of tokens
3. Custom objectTransform maps part of json into different objects
4. Object parsed back into stream of tokens
5. stream-json stringer assembles tokens into writable stream
6. Writes to result.json

## Running example

```
npm install
npm run generate-data && npm run example
```

Creates result.json

## Todo

- [X] Support removing objects and properties
    - Objects in array can be removed by return undefined
    - Object properties can't be removed, use stream-json ignore filter to ignore them before passing to transform 