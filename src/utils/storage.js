export const STORAGE_KEYS = {
    USERS: 'piti_users',
    BUYERS: 'piti_buyers',
    BRANDS: 'piti_brands',
    CONTRACTS: 'piti_contracts',
    SESSION: 'piti_session',
};
export function getAll(key) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
    }
    catch {
        return [];
    }
}
export function getById(key, id) {
    const items = getAll(key);
    return items.find((item) => item.id === id) ?? null;
}
export function save(key, item) {
    const items = getAll(key);
    const idx = items.findIndex((i) => i.id === item.id);
    if (idx >= 0) {
        items[idx] = item;
    }
    else {
        items.push(item);
    }
    localStorage.setItem(key, JSON.stringify(items));
}
export function remove(key, id) {
    const items = getAll(key);
    localStorage.setItem(key, JSON.stringify(items.filter((i) => i.id !== id)));
}
export function initSeed(key, seedData) {
    const existing = localStorage.getItem(key);
    if (!existing || JSON.parse(existing).length === 0) {
        localStorage.setItem(key, JSON.stringify(seedData));
    }
}
