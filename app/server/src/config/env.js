require('dotenv').config();

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

const config = {
    env: process.env.NODE_ENV || 'development',
    jwtSecret: leggiSegretoJwt(),
    // Tentativi di login o registrazione consentiti per IP ogni 15 minuti.
    authRateLimit: numero(process.env.AUTH_RATE_LIMIT, 20),
};

module.exports = config;
