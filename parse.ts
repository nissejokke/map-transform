import { Readable } from "node:stream";
import { JsonStreamType } from "./types";
import Asm from 'stream-json/Assembler';
import { parser } from 'stream-json';

export function assembleArrayStream<T>(buffer: JsonStreamType[]): Promise<T> {
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

export function dissambleObjectIntoStream<T>(obj: T): Promise<JsonStreamType[]> {
    return new Promise((resolve, reject) => {
        let buffer: JsonStreamType[] = [];
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