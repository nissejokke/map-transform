import assert from 'assert';
import { chain } from 'stream-chain';
import { parser } from 'stream-json';
import { transformObject } from '../transform';
import { Readable } from 'stream';
import Asm from 'stream-json/Assembler';

describe('transform', () => {
    let result;

    beforeEach(async () => {
        result = await new Promise<string>((resolve, reject) => {
            const pipeline = chain([
                Readable.from([JSON.stringify({
                    products: [{
                        id: 1,
                        title: 'title 1'
                    }, {
                        id: 2,
                        title: 'title 2'
                    }],
                    version: 1
                })]),
                parser({ streamKeys: false, streamStrings: false, streamNumbers: false, streamValues: false }),
                transformObject<any>({
                    mapFn: (obj, path) => {
                        if (path === 'products') {
                            if (obj.id === 1)
                                return { action: 'replace', value: undefined };
                            return {
                                action: 'replace', value: {
                                    id: obj.id, title: obj.title + '!'
                                }
                            };
                        }
                        else if (path === 'version') {
                            return { action: 'replace', value: obj + 1 };
                        } else
                            return { action: 'keep' };
                    }
                }),
                // not sure why this is needed
                data => data,
            ]);

            const asm = Asm.connectTo(pipeline);
            asm.on('done', asm => {
                resolve(asm.current);
            });

            pipeline.on('error', reject);
        });
    });

    it('should transform object', async () => {

        // act
        assert.deepEqual(result, {
            products: [{
                id: '2',
                title: 'title 2!'
            }],
            version: 1
        })

    });
});