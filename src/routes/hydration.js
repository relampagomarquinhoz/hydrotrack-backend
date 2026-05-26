const express = require('express');
const router  = express.Router();
const hydCtrl = require('../controllers/hydrationController');
const authMw  = require('../middlewares/auth');

// Todas as rotas de hidratação são protegidas
router.use(authMw);

router.post('/log',              hydCtrl.addLog);        // Registrar água
router.get('/today',             hydCtrl.todaySummary);  // Resumo do dia
router.get('/history',           hydCtrl.history);       // Histórico (days=7)
router.get('/streak',            hydCtrl.streak);        // Dias consecutivos
router.delete('/log/:id',        hydCtrl.deleteLog);     // Apagar registro individual por UUID
// FIX: nova rota — apaga todos os logs de um dia (usada pelo histórico do front)
router.delete('/history/:date',  hydCtrl.deleteByDate);  // Apagar todos os logs de uma data (YYYY-MM-DD)

module.exports = router;
