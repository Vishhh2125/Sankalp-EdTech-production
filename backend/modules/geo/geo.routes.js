import { Router } from 'express';
import { getCountries, getStates, getCities } from './geo.controller.js';

const router = Router();

router.get('/countries', getCountries);
router.get('/states', getStates);
router.get('/cities', getCities);

export default router;
