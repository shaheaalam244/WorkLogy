export const registerJobSocket = (io, socket) => {
  // Join a specific job room for live tracking
  socket.on('join_job', (jobId) => {
    if (jobId) {
      socket.join('job_' + jobId);
      console.log(`Socket ${socket.id} joined job room: ${jobId}`);
    }
  });

  // Live status update broadcast
  socket.on('job_status_change', ({ jobId, status, updatedBy }) => {
    io.to('job_' + jobId).emit('job_status_updated', {
      jobId,
      status,
      updatedBy,
      timestamp: new Date()
    });
  });
};
