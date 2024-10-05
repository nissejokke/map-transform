export type JsonToken = { name: 'startObject' }
    | { name: 'endObject' }
    | { name: 'startArray' }
    | { name: 'endArray' }
    | { name: 'keyValue', value: string }
    | { name: 'stringValue', value: string }
    | { name: 'numberValue', value: string }
    | { name: 'nullValue', value: null }
    | { name: 'trueValue', value: true }
    | { name: 'falseValue', value: false };