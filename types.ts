export type JsonStreamType = { name: 'startObject' }
    | { name: 'endObject' }
    | { name: 'keyValue', value: string }
    | { name: 'startArray' }
    | { name: 'endArray' };