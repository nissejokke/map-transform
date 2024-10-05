import { Readable } from "node:stream";
import { JsonToken } from "./types";
import Asm from 'stream-json/Assembler';
import { parser } from 'stream-json';

/**
 * Takes array of tokens and creates a object
 */
export function assembleArrayStream<T>(buffer: JsonToken[]): Promise<T> {
    return new Promise((resolve, reject) => {
        const readable = new Readable({ objectMode: true });
        for (const o of buffer) readable.push(o);
        readable.push(null);

        const asm = Asm.connectTo(readable);
        asm.on('done', asm => {
            resolve(asm.current);
        });
    })
}

/**
 * Takes and object and returns an array of tokens
 */
export function dissambleObjectIntoStream<T>(obj: T): Promise<JsonToken[]> {
    return new Promise((resolve, reject) => {
        let buffer: JsonToken[] = [];
        const pipeline = Readable.from([JSON.stringify(obj)])
            .pipe(parser({ streamKeys: false, streamStrings: false, streamNumbers: false }));
        pipeline.on('data', (data) => {
            buffer.push(data);
        })
        pipeline.on('end', () => {
            resolve(buffer);
        });
        pipeline.on('error', reject);
    });
}