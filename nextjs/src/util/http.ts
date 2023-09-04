import path from 'path';

export const fetcher = (url: string) => fetch(url).then((res) => res.json());