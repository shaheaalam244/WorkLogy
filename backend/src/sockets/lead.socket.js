export const registerLeadSocket = (io, socket) => {
  // Vendor subscribes to category lead streams
  socket.on('subscribe_category_leads', (categoryId) => {
    if (categoryId) {
      socket.join('leads_' + categoryId);
      console.log(`Vendor subscribed to leads for category: ${categoryId}`);
    }
  });

  // Broadcast new lead to vendors in category
  socket.on('new_lead_created', (leadData) => {
    if (leadData && leadData.category) {
      io.to('leads_' + leadData.category).emit('new_lead_alert', leadData);
    }
  });
};
