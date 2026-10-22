import test from 'node:test';
import assert from 'node:assert/strict';

// Helper matching logic extracted from Navbar.jsx
export function isRouteActive(currentPath, targetPath) {
  if (targetPath === '/') {
    return currentPath === '/';
  }
  return currentPath === targetPath || currentPath.startsWith(targetPath + '/');
}

// City display label logic
export function getCityDisplayLabel(city) {
  return (city && city.trim()) ? city.trim() : 'Nearby Area';
}

// Nav links definitions by role contract
export function getNavLinksForRole(role) {
  if (role === 'vendor') {
    return [
      { label: 'Home', to: '/' },
      { label: 'Find Available Jobs', to: '/vendor/browse-jobs' },
      { label: 'My Services', to: '/vendor/services' },
      { label: 'How It Works', to: '/how-it-works' },
    ];
  }
  if (role === 'admin') {
    return [
      { label: 'Home', to: '/' },
      { label: 'Explore Services', to: '/categories' },
      { label: 'Emergency', to: '/emergency', isEmergency: true },
      { label: 'Find Available Jobs', to: '/jobs' },
      { label: 'Admin Console', to: '/admin/dashboard' },
    ];
  }
  // Customer & Guest
  return [
    { label: 'Home', to: '/' },
    { label: 'Explore Services', to: '/categories' },
    { label: 'Emergency', to: '/emergency', isEmergency: true },
    { label: 'Find a Professional', to: '/professionals' },
    { label: 'My Jobs', to: '/customer/my-jobs' },
    { label: 'How It Works', to: '/how-it-works' },
  ];
}

test('Navbar Navigation Contract - Guest & Customer', () => {
  const links = getNavLinksForRole('customer');
  const labels = links.map(l => l.label);
  assert.deepEqual(labels, [
    'Home',
    'Explore Services',
    'Emergency',
    'Find a Professional',
    'My Jobs',
    'How It Works'
  ]);

  const emergencyLink = links.find(l => l.label === 'Emergency');
  assert.equal(emergencyLink.to, '/emergency');
  assert.equal(emergencyLink.isEmergency, true);
});

test('Navbar Navigation Contract - Vendor', () => {
  const links = getNavLinksForRole('vendor');
  const labels = links.map(l => l.label);
  assert.deepEqual(labels, [
    'Home',
    'Find Available Jobs',
    'My Services',
    'How It Works'
  ]);
  assert.equal(links.some(l => l.to === '/vendor/browse-jobs'), true);
});

test('Navbar Navigation Contract - Admin', () => {
  const links = getNavLinksForRole('admin');
  const labels = links.map(l => l.label);
  assert.deepEqual(labels, [
    'Home',
    'Explore Services',
    'Emergency',
    'Find Available Jobs',
    'Admin Console'
  ]);
  assert.equal(links.some(l => l.to === '/admin/dashboard'), true);
});

test('Navbar Active Route Matching - Precise boundaries', () => {
  // Root matches only root
  assert.equal(isRouteActive('/', '/'), true);
  assert.equal(isRouteActive('/categories', '/'), false);

  // Exact match
  assert.equal(isRouteActive('/categories', '/categories'), true);
  assert.equal(isRouteActive('/emergency', '/emergency'), true);

  // Subroutes
  assert.equal(isRouteActive('/customer/my-jobs/12345', '/customer/my-jobs'), true);
  assert.equal(isRouteActive('/categories/electrical-services', '/categories'), true);

  // Prevent false substring collisions
  assert.equal(isRouteActive('/jobs-archive', '/jobs'), false);
  assert.equal(isRouteActive('/how-it-works-guide', '/how-it-works'), false);
});

test('Navbar Location Selector Label - Fallback', () => {
  assert.equal(getCityDisplayLabel('Lucknow, UP'), 'Lucknow, UP');
  assert.equal(getCityDisplayLabel('Gomti Nagar, Lucknow'), 'Gomti Nagar, Lucknow');
  assert.equal(getCityDisplayLabel(''), 'Nearby Area');
  assert.equal(getCityDisplayLabel(null), 'Nearby Area');
  assert.equal(getCityDisplayLabel(undefined), 'Nearby Area');
});
