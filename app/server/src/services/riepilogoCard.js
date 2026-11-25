const { literal } = require('sequelize');
const { Card, User, Label } = require('../models');

// Quello che serve per disegnare una card nella board: i dettagli (testo dei
// commenti, elementi delle checklist) li carica la modale quando si apre la card.
// I conteggi sono sottoquery: una sola query invece di caricare tutte le righe.
const CONTEGGI = [
    [literal('(SELECT COUNT(*) FROM comments AS c WHERE c.card_id = `Card`.`id`)'), 'commentCount'],
    [
        literal(
            '(SELECT COUNT(*) FROM checklist_items AS ci JOIN checklists AS cl ON ci.checklist_id = cl.id WHERE cl.card_id = `Card`.`id`)'
        ),
        'checklistTotal',
    ],
    [
        literal(
            '(SELECT COUNT(*) FROM checklist_items AS ci JOIN checklists AS cl ON ci.checklist_id = cl.id WHERE cl.card_id = `Card`.`id` AND ci.is_completed = 1)'
        ),
        'checklistDone',
    ],
];

// Dei membri bastano nome e avatar: l'email resta fuori dalla vista della board.
const INCLUDE = [
    {
        model: User,
        as: 'members',
        attributes: ['id', 'name', 'avatar'],
        through: { attributes: [] },
    },
    { model: Label, as: 'labels', through: { attributes: [] } },
];

const normalizza = (card) => {
    const dati = card.toJSON();
    for (const campo of ['commentCount', 'checklistTotal', 'checklistDone']) {
        dati[campo] = Number(dati[campo]) || 0;
    }
    return dati;
};

const riepiloghiCard = async (where, opzioni = {}) => {
    const cards = await Card.findAll({
        where,
        attributes: { include: CONTEGGI },
        include: INCLUDE,
        order: [
            ['position', 'ASC'],
            ['id', 'ASC'],
        ],
        ...opzioni,
    });
    return cards.map(normalizza);
};

const riepilogoCard = async (id) => {
    const [card] = await riepiloghiCard({ id });
    return card || null;
};

module.exports = { riepiloghiCard, riepilogoCard };
