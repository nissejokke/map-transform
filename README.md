# Custom stream-json transform

Custom transform filter that can transform different objects in a json.

1. Reads data.json as a read stream
2. stream-json parses json into stream of tokens
3. Custom transform maps part of json into different objects
4. Object parsed back into stream of tokens
5. stream-json stringer assembles tokens into writable stream
6. Writes to result.json

## Running

```
 npm start
```

Creates result.json

## Todo

- [X] Support removing objects and properties
    - Objects in array can be removed by return undefined
    - Object properties can't be removed, use stream-json ignore filter to ignore them before passing to transform 