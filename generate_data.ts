import { writeFileSync } from 'node:fs';

const data = {
    categories: [{
        id: 'c1',
        title: 'Category 1'
    }],
    products: new Array(1).fill(0).map((p, i) => ({
        id: i.toString(),
        title: 'Product ' + i,
        description: 'Description for product ' + i
    })),
    culture: {
        code: 'sv-se'
    },
    created: "2024-10-04T19:54:00.000Z"
};
writeFileSync('data.json', JSON.stringify(data, null, 2));