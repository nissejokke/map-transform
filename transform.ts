import { Transform } from "node:stream";
import { JsonToken } from "./types";
import { assembleArrayStream, dissambleObjectIntoStream } from "./conversions";

/**
 * It can be used to transform values in large json. Basically a js map function but for streamed large json.
 * 
 * Expects a json which consists of an object as root. For each child property value, and item in array directly under root, it calls mapFn. 
 * The value will be replaced or kept depending in response from mapFn.
 *
 * NOTE: Not suitable for when child objects are really large since the entire object is kept in 
 * memory when passed to mapFn.
 */
export function map<T>(args: {
    /**
     * Replaces obj with new value in json
     * @param value captured value to pass to mapping function
     * @param path name of property value to belongs to
     * @returns undefined to keep same value, null for null and other values for replacement
     */
    mapFn: (value: T, path: string) => { action: 'replace', value: unknown } | { action: 'no action' },
}) {

    let buffer: JsonToken[] = [];
    let objectDepth = 0;
    let recordMode = false;
    let path: string = '';
    const valueMatchers = ['stringValue', 'numberValue', 'trueValue', 'falseValue', 'nullValue', 'undefinedValue'];

    const stream = new Transform({
        objectMode: true,
        async transform(chunk: JsonToken, encoding, callback) {
            if (chunk.name === 'startObject') objectDepth++;
            if (chunk.name === 'endObject') objectDepth--;
            if (chunk.name === 'keyValue' && objectDepth === 1) path = chunk.value;

            const matchedValue = objectDepth === 1 && valueMatchers.includes(chunk.name);

            if (!recordMode) {
                if (objectDepth === 2 && chunk.name === 'startObject')
                    recordMode = true;
                else if (matchedValue)
                    recordMode = true;
            }

            // in recordMode, chunks are stored in buffer instead of passed along
            if (recordMode) {
                if (chunk.name === 'endObject' && objectDepth === 1)
                    recordMode = false;
                else if (matchedValue)
                    recordMode = false;

                buffer.push(chunk);

                if (!recordMode && buffer.length) {
                    // encountered en of object, let's assemble the tokens into an object and
                    // pass it to mapFn
                    const obj = await assembleArrayStream<T>(buffer);
                    const result = args.mapFn(obj, path);
                    let newbuffer;
                    if (result.action === 'replace') {
                        const { value } = result;
                        if (value === undefined)
                            newbuffer = [];
                        else if (value === null)
                            newbuffer = [{ name: 'nullValue', value: null }];
                        else
                            newbuffer = await dissambleObjectIntoStream(value);
                    }
                    else
                        newbuffer = buffer;

                    buffer = [];
                    callback(null, newbuffer);
                }
                else
                    callback(null);
            }
            else
                callback(null, chunk);

        },
    });
    return stream;
}