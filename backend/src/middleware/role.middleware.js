export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: role ' + req.user.role + ' is not authorized'
      });
    }

    next();
  };
};

export const authorizeAdminRole = (...adminRoles) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin authorization required'
      });
    }

    const currentAdminRole = req.user.adminRole || 'super_admin';
    if (currentAdminRole === 'super_admin' || adminRoles.includes(currentAdminRole)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Permission denied: ${currentAdminRole} is not authorized for this action`
    });
  };
};
