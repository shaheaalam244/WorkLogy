import SupportTicket from '../models/SupportTicket.js';

export const getMyTickets = async (req, res, next) => {
  try {
    const tickets = await SupportTicket.find({ user: req.user.id })
      .populate('responses.sender', 'name role')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: tickets.length, tickets });
  } catch (error) {
    next(error);
  }
};

export const createTicket = async (req, res, next) => {
  try {
    const { category, subject, description, priority } = req.body;

    if (!subject || !description) {
      return res.status(400).json({ success: false, message: 'Subject and description are required' });
    }

    const ticketNumber = `SUP-${Math.floor(1000 + Math.random() * 9000)}`;

    const ticket = await SupportTicket.create({
      ticketNumber,
      user: req.user.id,
      category: category || 'general',
      subject,
      description,
      priority: priority || 'medium',
      status: 'open'
    });

    res.status(201).json({
      success: true,
      message: 'Support ticket opened successfully. Our compliance team will respond within 4 hours.',
      ticket
    });
  } catch (error) {
    next(error);
  }
};

export const addTicketResponse = async (req, res, next) => {
  try {
    const { message } = req.body;
    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    if (ticket.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    ticket.responses.push({
      sender: req.user.id,
      message,
      createdAt: new Date()
    });

    if (ticket.status === 'resolved' || ticket.status === 'closed') {
      ticket.status = 'open';
    }

    await ticket.save();

    res.status(200).json({ success: true, ticket });
  } catch (error) {
    next(error);
  }
};
