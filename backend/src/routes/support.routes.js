import express from 'express';
import {
  getMyTickets,
  createTicket,
  addTicketResponse
} from '../controllers/support.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/my', protect, getMyTickets);
router.post('/', protect, createTicket);
router.post('/:id/reply', protect, addTicketResponse);

export default router;
