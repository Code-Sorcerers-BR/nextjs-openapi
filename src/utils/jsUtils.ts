export function castArray(arr: any) {
    return Array.isArray(arr) ? arr : [arr]
}