import { dbAdm } from './lib/firebase-admin';

console.log('--- ADMIN INIT CHECK ---');
console.log('dbAdm type:', typeof dbAdm);
try {
    console.log('dbAdm collection method exists:', typeof dbAdm.collection === 'function');
} catch (e) {
    console.log('dbAdm access error:', e);
}
