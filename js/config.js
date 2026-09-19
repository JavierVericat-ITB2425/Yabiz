// Pega aquí la configuración de tu proyecto Firebase (ver README.md, paso 2).
// Si lo dejas vacío, la app funciona en "modo demo": guarda solo en este navegador y no sincroniza.
export const CONFIG = {
  firebase: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
  },
  // Déjalo en true solo para crear tu cuenta la primera vez. Después ponlo en false:
  // desaparece el botón "Crear cuenta" y nadie más puede registrarse desde la app.
  allowSignup: true,
}
