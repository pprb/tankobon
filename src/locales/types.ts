/**
 * The shape every locale must follow: the English namespace with each string left free. Typing a
 * French namespace with it makes a missing or extra key a compile error, so the locales can't drift.
 */
export type Translation<T> = { [K in keyof T]: T[K] extends string ? string : Translation<T[K]> };
