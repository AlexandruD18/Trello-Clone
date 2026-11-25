require('dotenv').config({ quiet: true });

// Legge e controlla la configurazione una volta sola, all'avvio.
// Se manca qualcosa di indispensabile il processo si ferma con un messaggio chiaro.
const leggiSegretoJwt = () => {
    const segreto = process.env.JWT_SECRET;
    if (!segreto || segreto.length < 32) {
        throw new Error(
            'JWT_SECRET mancante o troppo corto (servono almeno 32 caratteri). ' +
                "Generane uno con: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\""
        );
    }
    return segreto;
};

const numero = (valore, predefinito) => {
    const n = Number(valore);
    return Number.isFinite(n) && n > 0 ? n : predefinito;
};

// TRUST_PROXY: 'false' (predefinito, Node esposto direttamente), un numero di
// proxy davanti (es. 1 con nginx) oppure un elenco di IP/sottoreti fidati.
// Con un valore sbagliato chiunque sceglie il proprio IP via X-Forwarded-For.
const leggiTrustProxy = (valore) => {
    if (!valore || valore === 'false') return false;
    if (/^\d+$/.test(valore)) return Number(valore);
    if (valore === 'true') {
        throw new Error(
            'TRUST_PROXY=true non è ammesso: fiderebbe di qualsiasi X-Forwarded-For. ' +
                'Usa il numero di proxy davanti al server (es. 1) oppure i loro IP.'
        );
    }
    return valore;
};

// Origini esterne autorizzate a chiamare le API (CORS), separate da virgola.
// Vuoto: solo la stessa origine. In sviluppo il proxy di Vite rende tutto same-origin.
const leggiOrigini = (valore) =>
    (valore || '')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);

const config = {
    env: process.env.NODE_ENV || 'development',
    port: numero(process.env.PORT, 3000),
    host: process.env.HOST || '0.0.0.0',
    corsOrigins: leggiOrigini(process.env.CORS_ORIGINS),
    jwtSecret: leggiSegretoJwt(),
    // Tentativi di login o registrazione consentiti per IP ogni 15 minuti.
    authRateLimit: numero(process.env.AUTH_RATE_LIMIT, 20),
    trustProxy: leggiTrustProxy(process.env.TRUST_PROXY),
    // true solo quando il sito è servito in HTTPS: attiva HSTS e upgrade-insecure-requests.
    https: process.env.HTTPS === 'true',
};

module.exports = config;
