/**
 * Returns a new object without any keys where the value would be undefined.
 * @private
 * */
export function removeUndefinedValues(object: { [key: string]: any }) {
    const res: { [key: string]: any } = {};
    for (var key in object) {
        var val = object[key];
        if (val !== undefined) {
            res[key] = val;
        }
    }
    return res;
}
