// Datos en Firebase Firestore: sincronización en tiempo real + caché offline en cada dispositivo.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut as fbSignOut, sendPasswordResetEmail,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, onSnapshot, setDoc, deleteDoc,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'

let auth, db, uid

export function init(cfg) {
  const app = initializeApp(cfg)
  auth = getAuth(app)
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    ignoreUndefinedProperties: true,
  })
}

export function onAuth(cb) {
  onAuthStateChanged(auth, u => { uid = u?.uid; cb(u ? { uid: u.uid, email: u.email } : null) })
}
export const signIn = (email, pass) => signInWithEmailAndPassword(auth, email, pass)
export const signUp = (email, pass) => createUserWithEmailAndPassword(auth, email, pass)
export const resetPassword = email => sendPasswordResetEmail(auth, email)
export const signOut = () => fbSignOut(auth)

export function subscribe(col, cb) {
  return onSnapshot(
    collection(db, 'users', uid, col),
    { includeMetadataChanges: true }, // para saber cuándo los datos ya vienen confirmados del servidor
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() })), snap.metadata.fromCache),
    err => console.error('[firestore]', col, err),
  )
}
// No se espera a la promesa: con conexión se sube al instante y sin conexión queda en cola.
export const set = (col, id, data) =>
  setDoc(doc(db, 'users', uid, col, id), data, { merge: true }).catch(e => console.error('[firestore] set', e))
export const del = (col, id) =>
  deleteDoc(doc(db, 'users', uid, col, id)).catch(e => console.error('[firestore] del', e))
