import { Transform } from "node:stream";
import { JsonStreamType } from "./types";
import { assembleArrayStream, dissambleObjectIntoStream } from "./conversions";

export function transform<T>(args: { 
    shouldMapObject?: (path: string) => boolean,
    /**
     * Replaces obj with new value in json
     * @param obj object in json
     * @param path name of parent property
     * @returns undefined to keep same value, null for null and other values for replacement
     */ 
    mapFn: (obj: T, path: string) => unknown,
}) {

    let buffer: JsonStreamType[] = [];
    let objectDepth = 0;
    let recordMode = false;
    let path: string = '';

    const stream = new Transform({
        objectMode: true,
        async transform(chunk: JsonStreamType, encoding, callback) {
            if (chunk.name === 'startObject') objectDepth++;
            if (chunk.name === 'endObject') objectDepth--;
            if (chunk.name === 'keyValue' && objectDepth === 1) path = chunk.value;

            if (!recordMode) {
                if (chunk.name === 'startObject' && 
                    objectDepth === 2 && 
                    (args?.shouldMapObject ? args.shouldMapObject(path) : true)) {
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
                    const mappedObj = args.mapFn(obj, path);
                    let newbuffer;
                    if (mappedObj !== undefined && mappedObj  !== null)
                        newbuffer = await dissambleObjectIntoStream(mappedObj);
                    else if (mappedObj === undefined) newbuffer = buffer;
                    else if (mappedObj === null) newbuffer = [{ name: 'nullValue', value: null }];
                    else throw new Error('Unknown return value ' + mappedObj + ' from mapFn');

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