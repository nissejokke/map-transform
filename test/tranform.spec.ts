import assert from 'assert';
import { chain } from 'stream-chain';
import { parser } from 'stream-json';
import { MapTransform } from '../map-transform';
import { Readable } from 'stream';
import Asm from 'stream-json/Assembler';

describe('transform', () => {
    let result;

    beforeEach(async () => {
        const indata = {
            products: [{
                id: 1,
                title: 'title 1',
                description: 'description for product 1'
            }, {
                id: 2,
                title: 'title 2',
                description: 'description for product 2'
            }, {
                id: 3,
                title: 'title 3',
                description: 'description for product 3'
            }],
            version: 1,
            created: "2024-10-05T00:00:00",
            enabled: true,
            latest: false,
            createdBy: null,
            updatedBy: undefined
        };

        result = await new Promise<string>((resolve, reject) => {
            const pipeline = chain([
                Readable.from([JSON.stringify(indata)]),
                parser({ streamKeys: false, streamStrings: false, streamNumbers: false, streamValues: false }),
                new MapTransform<any>({
                    mapFn: (value, path) => {
                        if (path === 'products') {
                            if (value.id === 1)
                                return { action: 'replace', value: undefined };
                            else if (value.id === 3)
                                return { action: 'replace', value: null };
                            return {
                                action: 'replace', value: { id: value.id, title: value.title + '!' }
                            };
                        }
                        else if (path === 'version') {
                            return { action: 'replace', value: value + 1 };
                        } else if (path === 'created') {
                            return { action: 'replace', value: value + '.000Z' };
                        } else if (path === 'enabled') {
                            return { action: 'replace', value: !value };
                        } else if (path === 'latest') {
                            return { action: 'replace', value: !value };
                        } else if (path === 'createdBy') {
                            return { action: 'replace', value: 'user' };
                        } else
                            return { action: 'no action' };
                    }
                })
            ]);

            const asm = Asm.connectTo(pipeline);
            asm.on('done', asm => {
                resolve(asm.current);
            });

            pipeline.on('error', reject);
        });
    });

    it('should transform object', async () => {
        // assert
        assert.deepEqual(result, {
            products: [{
                id: '2',
                title: 'title 2!',
            }, null],
            version: 2,
            created: "2024-10-05T00:00:00.000Z",
            enabled: false,
            latest: true,
            createdBy: 'user'
        });
    });
});