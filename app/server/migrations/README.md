# Migrazioni del database

Ogni modifica allo schema è una coppia di file in questa cartella:

- `NNNN-descrizione.up.sql` applica la modifica;
- `NNNN-descrizione.down.sql` la annulla.

Il numero a quattro cifre decide l'ordine. I file vanno al server così come sono, su una connessione dedicata con i controlli sulle chiavi esterne disattivati per tutta la durata del file.

## Comandi

```bash
npm run db:migrate          # applica quelle in sospeso (con lock: due deploy insieme non si pestano i piedi)
npm run db:pending          # elenca quelle in sospeso
npm run db:migrate:undo     # annulla l'ultima
npm run db:verifica         # confronta il database con i modelli Sequelize
```

Il server non parte finché ci sono migrazioni in sospeso.

## Regole

1. **Una modifica per migrazione.** Con MySQL ogni `ALTER TABLE` fa commit da solo: se una migrazione fallisce a metà, la parte già eseguita resta. Migrazioni piccole sono facili da riprendere a mano.
2. **Idempotenti dove si può** (`IF NOT EXISTS`, `IF EXISTS`).
3. **Nomi espliciti** per vincoli e indici. Il database di produzione nato da `sequelize.sync()` ha nomi generati (`*_ibfk_N`): prima di toccare un vincolo esistente controllane il nome in `information_schema`.
4. **Prima si aggiunge, poi si toglie.** Per rinominare o eliminare una colonna: in un deploy si aggiunge la nuova e il codice usa entrambe; solo nel deploy successivo si toglie la vecchia.
5. **Charset esplicito** nelle tabelle nuove: `DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci` (richiede MySQL 8).
6. **Il modello va aggiornato insieme alla migrazione.** Il test `migrazioni.test.js` controlla che ogni colonna dei modelli esista con lo stesso vincolo di null.

La `0001-schema-iniziale` non si annulla fuori dai test: cancellerebbe tutte le tabelle. Se serve davvero, `CONFERMA_CANCELLAZIONE_DATI=si`.
