import { Transform } from "node:stream";
import { JsonToken } from "./types";
import { assembleArrayStream, dissambleObjectIntoStream } from "./conversions";

/**
 * Transform stream to be used with stream-json.
 * Expects an object and will call mapFn for each object in direct properties or in array
 * The object with be replaced or kept depending in response from mapFn.
 * NOTE: Not suitable for when child objects are really large since the entire object is kept in 
 * memory when passed to mapFn  
 */
export function transformObject<T>(args: { 
    /**
     * Replaces obj with new value in json
     * @param obj object in json
     * @param path name of parent property
     * @returns undefined to keep same value, null for null and other values for replacement
     */ 
    mapFn: (obj: T, path: string) => { action: 'replace', value: unknown } | { action: 'keep' },
}) {

    let buffer: JsonToken[] = [];
    let objectDepth = 0;
    let recordMode = false;
    let path: string = '';

    const stream = new Transform({
        objectMode: true,
        async transform(chunk: JsonToken, encoding, callback) {
            if (chunk.name === 'startObject') objectDepth++;
            if (chunk.name === 'endObject') objectDepth--;
            if (chunk.name === 'keyValue' && objectDepth === 1) path = chunk.value;

            if (!recordMode) {
                if (chunk.name === 'startObject' && 
                    objectDepth === 2) {
                    recordMode = true;
                }
            }

            if (recordMode) {
                if (chunk.name === 'endObject' && objectDepth === 1) {
                    recordMode = false;
                }

                buffer.push(chunk);

                if (!recordMode && buffer.length) {
                    // console.log('yey we got an object');
                    // console.log(buffer);

                    const obj = await assembleArrayStream<T>(buffer);
                    const result = args.mapFn(obj, path);
                    let newbuffer;
                    if (result.action === 'replace') {
                        const { value } = result;   
                        if (typeof value === 'object')
                            newbuffer = await dissambleObjectIntoStream(value);
                        else if (value === undefined)
                            newbuffer = [];
                        else if (value === null) 
                            newbuffer = [{ name: 'nullValue', value: null }];
                        else throw new Error('Unknown return value ' + value + ' from mapFn');
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