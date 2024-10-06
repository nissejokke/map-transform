import { Transform, TransformCallback } from 'stream';
import { JsonToken } from './types';
import { assembleArrayStream, dissambleObjectIntoStream } from './conversions';

type MapFn<T> = (value: T, path: string) => { action: 'replace', value: unknown } | { action: 'no action' };

export class MapTransform<T> extends Transform {
    mapFn: MapFn<T>;

    private objectDepth = 0;

    private readonly valueMatchers = ['stringValue', 'numberValue', 'trueValue', 'falseValue', 'nullValue', 'undefinedValue'];

    private recordMode = false;

    private path = '';

    private buffer: JsonToken[] = [];

    constructor(args: { mapFn: MapFn<T> }) {
        super({ objectMode: true });
        this.mapFn = args.mapFn;
    }

    _transform(chunk: JsonToken, encoding: BufferEncoding, callback: TransformCallback): void {
        if (chunk.name === 'startObject') this.objectDepth++;
        if (chunk.name === 'endObject') this.objectDepth--;
        if (chunk.name === 'keyValue' && this.objectDepth === 1) this.path = chunk.value;

        const matchedValue = this.objectDepth === 1 && this.valueMatchers.includes(chunk.name);

        if (!this.recordMode) {
            if (this.objectDepth === 2 && chunk.name === 'startObject')
                this.recordMode = true;
            else if (matchedValue)
                this.recordMode = true;
        }

        // in recordMode, chunks are stored in buffer instead of passed along
        if (this.recordMode) {
            if (chunk.name === 'endObject' && this.objectDepth === 1)
                this.recordMode = false;
            else if (matchedValue)
                this.recordMode = false;

            this.buffer.push(chunk);

            if (!this.recordMode && this.buffer.length) {
                // encountered an of object, let's assemble the tokens into a value and
                // pass it to mapFn
                assembleArrayStream<T>(this.buffer).then(obj => {
                    const result = this.mapFn(obj, this.path);
                    const originalBuffer = this.buffer;
                    this.buffer = [];
                    if (result.action === 'replace') {
                        const { value } = result;
                        if (value === undefined)
                            callback();
                        else if (value === null) {
                            this.push({ name: 'nullValue', value: null });
                            callback();
                        } else {
                            dissambleObjectIntoStream(value).then(tokens => {
                                tokens.forEach(token => this.push(token));
                                callback();
                            });
                        }
                    }
                    else {
                        originalBuffer.forEach(token => this.push(token));
                        callback();
                    }
                })
            }
            else
                callback();
        }
        else {
            this.push(chunk);
            callback();
        }
    }
}