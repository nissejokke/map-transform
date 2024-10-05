import { Transform } from "node:stream";
import { JsonToken } from "./types";
import { assembleArrayStream, dissambleObjectIntoStream } from "./conversions";

/**
 * Expects a json which consists of an object as root. For each child object it calls mapFn. 
 * Also for objects in arrays where the array is a direct child to the root.
 * The object with be replaced or kept depending in response from mapFn.
 * NOTE: Not suitable for when child objects are really large since the entire object is kept in 
 * memory when passed to mapFn. 
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
                if (chunk.name === 'startObject' && objectDepth === 2) {
                    recordMode = true;
                }
            }

            // in recordMode, chunks are stored in buffer instead of passed along
            if (recordMode) {
                if (chunk.name === 'endObject' && objectDepth === 1) {
                    recordMode = false;
                }

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