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
    }))
};
writeFileSync('data.json', JSON.stringify(data, null, 2));