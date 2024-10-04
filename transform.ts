import { Transform } from "node:stream";
import { JsonStreamType } from "./types";
import { assembleArrayStream, dissambleObjectIntoStream } from "./conversions";

export function transform() {

    let buffer: JsonStreamType[] = [];
    let objectDepth = 0;
    let recordMode = false;
    const path: string[] = [];

    const stream = new Transform({
        objectMode: true,
        async transform(chunk: JsonStreamType, encoding, callback) {
            if (chunk.name === 'startObject') { objectDepth++; }
            if (chunk.name === 'endObject') objectDepth--;
            if (chunk.name === 'keyValue') path[objectDepth] = chunk.value;

            if (!recordMode) {
                if (chunk.name === 'startObject' && objectDepth === 2 && path[objectDepth - 1] === 'categories') {
                    recordMode = true;
                }
            }

            if (recordMode) {
                if (chunk.name === 'endObject' && objectDepth === 1) {
                    recordMode = false;
                }

                buffer.push(chunk);

                if (!recordMode && buffer.length) {
                    console.log('yey we got an object');
                    console.log(buffer);

                    const obj = await assembleArrayStream<{ id: string, title: string }>(buffer);
                    buffer = await dissambleObjectIntoStream({ id: obj.id + ' 2', title: obj.title });

                    callback(null, buffer);
                    buffer = [];
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