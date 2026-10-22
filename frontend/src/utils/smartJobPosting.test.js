import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * WorkLogy Smart Job Posting — Comprehensive MVP Test Suite
 */

// 1. PIN Code Validation for India
const validateIndianPinCode = (pin) => {
  if (!pin || typeof pin !== 'string') return false;
  return /^[1-9][0-9]{5}$/.test(pin.trim());
};

// 2. Job Title & Description Validation
const validateServiceDetails = ({ title, description, category }) => {
  const errors = {};
  if (!category || !String(category).trim()) {
    errors.category = 'Service category is required';
  }
  if (!title || !title.trim()) {
    errors.title = 'Job title is required';
  } else if (title.trim().length < 3) {
    errors.title = 'Job title must be at least 3 characters long';
  } else if (title.trim().length > 120) {
    errors.title = 'Job title must not exceed 120 characters';
  }

  if (!description || !description.trim()) {
    errors.description = 'Description is required';
  } else if (description.trim().length < 10) {
    errors.description = 'Description must be at least 10 characters long';
  } else if (description.trim().length > 2000) {
    errors.description = 'Description must not exceed 2000 characters';
  }

  return { isValid: Object.keys(errors).length === 0, errors };
};

// 3. Budget Range and Monies Validation
const validateBudget = (budget) => {
  if (!budget || !budget.type) {
    return { isValid: false, error: 'Budget type is required' };
  }
  const validTypes = ['quote', 'fixed', 'range', 'hourly'];
  if (!validTypes.includes(budget.type)) {
    return { isValid: false, error: 'Invalid budget type' };
  }

  if (budget.type === 'fixed' || budget.type === 'hourly') {
    const amt = Number(budget.amount);
    if (isNaN(amt) || amt <= 0) {
      return { isValid: false, error: 'Budget amount must be a positive number' };
    }
  }

  if (budget.type === 'range') {
    const min = Number(budget.minAmount ?? budget.min);
    const max = Number(budget.maxAmount ?? budget.max);
    if (isNaN(min) || isNaN(max) || min < 0 || max < 0) {
      return { isValid: false, error: 'Budget amounts cannot be negative' };
    }
    if (min > max && max > 0) {
      return { isValid: false, error: 'Minimum budget cannot exceed maximum budget' };
    }
  }

  return { isValid: true };
};

// 4. Preferred Date validation in Asia/Kolkata
const validatePreferredDate = (dateStr) => {
  if (!dateStr) return { isValid: true }; // optional
  const dateVal = new Date(dateStr);
  if (isNaN(dateVal.getTime())) {
    return { isValid: false, error: 'Invalid date format' };
  }
  const todayIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const selectedDate = String(dateStr).slice(0, 10);
  if (selectedDate < todayIST) {
    return { isValid: false, error: 'Preferred service date cannot be in the past' };
  }
  return { isValid: true };
};

// 5. Photos count validation
const validatePhotos = (images) => {
  if (!images) return { isValid: true, count: 0 };
  if (!Array.isArray(images)) return { isValid: false, error: 'Images must be an array' };
  if (images.length > 5) return { isValid: false, error: 'Maximum of 5 images allowed per job request' };
  return { isValid: true, count: images.length };
};

// 6. Address Privacy Masking Helper
const maskJobAddressForOpenFeed = (job) => {
  const isAssigned = Boolean(job.status === 'assigned' || job.status === 'in_progress' || job.status === 'completed');
  if (isAssigned) {
    return {
      isMasked: false,
      houseNumber: job.location?.houseNumber || '',
      street: job.location?.street || '',
      locality: job.location?.locality || '',
      city: job.location?.city || '',
      pinCode: job.location?.zipCode || '',
      contactPhone: job.contactPhone || 'Visible'
    };
  }
  return {
    isMasked: true,
    houseNumber: '***',
    street: '*** [Protected on Open Tender]',
    locality: job.location?.locality || '',
    city: job.location?.city || '',
    pinCode: job.location?.zipCode || '',
    contactPhone: ''
  };
};

// -------------------------------------------------------------
// TESTS
// -------------------------------------------------------------

test('Smart Job Posting — Indian PIN Code Validation', async (t) => {
  await t.test('Accepts valid 6-digit Indian PIN codes', () => {
    assert.equal(validateIndianPinCode('226001'), true);
    assert.equal(validateIndianPinCode('226010'), true);
    assert.equal(validateIndianPinCode('110001'), true);
    assert.equal(validateIndianPinCode('560001'), true);
    assert.equal(validateIndianPinCode(' 400001 '), true); // with whitespace trimming
  });

  await t.test('Rejects invalid PIN codes', () => {
    assert.equal(validateIndianPinCode('026001'), false); // starts with 0
    assert.equal(validateIndianPinCode('22600'), false);  // 5 digits
    assert.equal(validateIndianPinCode('2260011'), false); // 7 digits
    assert.equal(validateIndianPinCode('22600A'), false); // alphanumeric
    assert.equal(validateIndianPinCode(''), false);       // empty
    assert.equal(validateIndianPinCode(null), false);     // null
  });
});

test('Smart Job Posting — Service Category & Details Validation', async (t) => {
  await t.test('Rejects missing category', () => {
    const res = validateServiceDetails({
      title: 'AC cooling failure',
      description: 'The split AC does not blow cold air and compressor trips.',
      category: ''
    });
    assert.equal(res.isValid, false);
    assert.ok(res.errors.category);
  });

  await t.test('Rejects short title (< 3 chars) or long title (> 120 chars)', () => {
    const shortRes = validateServiceDetails({
      title: 'AC',
      description: 'The split AC does not blow cold air and compressor trips.',
      category: 'cat_123'
    });
    assert.equal(shortRes.isValid, false);
    assert.ok(shortRes.errors.title);

    const longRes = validateServiceDetails({
      title: 'A'.repeat(121),
      description: 'The split AC does not blow cold air and compressor trips.',
      category: 'cat_123'
    });
    assert.equal(longRes.isValid, false);
    assert.ok(longRes.errors.title);
  });

  await t.test('Rejects description < 10 characters or > 2000 characters', () => {
    const shortDesc = validateServiceDetails({
      title: 'AC Repair Needed',
      description: 'Broken AC',
      category: 'cat_123'
    });
    assert.equal(shortDesc.isValid, false);
    assert.ok(shortDesc.errors.description);

    const longDesc = validateServiceDetails({
      title: 'AC Repair Needed',
      description: 'B'.repeat(2001),
      category: 'cat_123'
    });
    assert.equal(longDesc.isValid, false);
    assert.ok(longDesc.errors.description);
  });

  await t.test('Accepts valid title, description, and category', () => {
    const valid = validateServiceDetails({
      title: 'AC cooling is not working in master bedroom',
      description: 'The split AC unit blows air but it is room temperature. Compressor turns on for 30s then trips.',
      category: 'cat_123'
    });
    assert.equal(valid.isValid, true);
    assert.equal(Object.keys(valid.errors).length, 0);
  });
});

test('Smart Job Posting — Budget Rules & Range Validation', async (t) => {
  await t.test('Accepts competitive quote mode', () => {
    const res = validateBudget({ type: 'quote' });
    assert.equal(res.isValid, true);
  });

  await t.test('Accepts valid fixed budget', () => {
    const res = validateBudget({ type: 'fixed', amount: 1500 });
    assert.equal(res.isValid, true);
  });

  await t.test('Rejects zero or negative fixed budget', () => {
    const zeroRes = validateBudget({ type: 'fixed', amount: 0 });
    assert.equal(zeroRes.isValid, false);

    const negRes = validateBudget({ type: 'fixed', amount: -500 });
    assert.equal(negRes.isValid, false);
  });

  await t.test('Accepts valid price range where min <= max', () => {
    const res = validateBudget({ type: 'range', minAmount: 800, maxAmount: 1800 });
    assert.equal(res.isValid, true);

    const equalRes = validateBudget({ type: 'range', minAmount: 1000, maxAmount: 1000 });
    assert.equal(equalRes.isValid, true);
  });

  await t.test('Rejects price range where min > max', () => {
    const res = validateBudget({ type: 'range', minAmount: 2000, maxAmount: 1000 });
    assert.equal(res.isValid, false);
    assert.equal(res.error, 'Minimum budget cannot exceed maximum budget');
  });

  await t.test('Rejects negative amounts in range', () => {
    const res = validateBudget({ type: 'range', minAmount: -100, maxAmount: 500 });
    assert.equal(res.isValid, false);
  });
});

test('Smart Job Posting — Preferred Schedule Date Validation', async (t) => {
  const todayIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

  await t.test('Accepts today and future dates in Asia/Kolkata', () => {
    assert.equal(validatePreferredDate(todayIST).isValid, true);
    assert.equal(validatePreferredDate('2099-12-31').isValid, true);
  });

  await t.test('Rejects past dates in Asia/Kolkata', () => {
    const res = validatePreferredDate('2020-01-01');
    assert.equal(res.isValid, false);
    assert.equal(res.error, 'Preferred service date cannot be in the past');
  });

  await t.test('Accepts empty or flexible date', () => {
    assert.equal(validatePreferredDate('').isValid, true);
    assert.equal(validatePreferredDate(null).isValid, true);
  });
});

test('Smart Job Posting — Photo Attachments Limit', async (t) => {
  await t.test('Allows zero photos (photos are optional)', () => {
    const res = validatePhotos([]);
    assert.equal(res.isValid, true);
    assert.equal(res.count, 0);
  });

  await t.test('Allows up to 5 photos', () => {
    const res = validatePhotos([
      'https://res.cloudinary.com/demo/image/upload/1.jpg',
      'https://res.cloudinary.com/demo/image/upload/2.jpg',
      'https://res.cloudinary.com/demo/image/upload/3.jpg'
    ]);
    assert.equal(res.isValid, true);
    assert.equal(res.count, 3);
  });

  await t.test('Rejects more than 5 photos', () => {
    const res = validatePhotos([
      'https://res.cloudinary.com/demo/image/upload/1.jpg',
      'https://res.cloudinary.com/demo/image/upload/2.jpg',
      'https://res.cloudinary.com/demo/image/upload/3.jpg',
      'https://res.cloudinary.com/demo/image/upload/4.jpg',
      'https://res.cloudinary.com/demo/image/upload/5.jpg',
      'https://res.cloudinary.com/demo/image/upload/6.jpg'
    ]);
    assert.equal(res.isValid, false);
    assert.equal(res.error, 'Maximum of 5 images allowed per job request');
  });
});

test('Smart Job Posting — Customer Address Privacy Masking on Open Feeds', async (t) => {
  const sampleJob = {
    _id: 'job_123456',
    title: 'AC cooling is not working',
    status: 'open',
    contactPhone: '+91 9876543210',
    location: {
      houseNumber: 'Flat 402, Block C',
      street: 'Vibhuti Khand, Gomti Nagar',
      locality: 'Sector 4',
      city: 'Lucknow',
      zipCode: '226010'
    }
  };

  await t.test('Open job masks house number, street, and phone from open tender viewers', () => {
    const masked = maskJobAddressForOpenFeed(sampleJob);
    assert.equal(masked.isMasked, true);
    assert.equal(masked.houseNumber, '***');
    assert.equal(masked.street, '*** [Protected on Open Tender]');
    assert.equal(masked.locality, 'Sector 4');
    assert.equal(masked.city, 'Lucknow');
    assert.equal(masked.pinCode, '226010');
    assert.equal(masked.contactPhone, '');
  });

  await t.test('Assigned job unmasks full house number, street, and contact details to authorized contractor', () => {
    const assignedJob = { ...sampleJob, status: 'assigned' };
    const unmasked = maskJobAddressForOpenFeed(assignedJob);
    assert.equal(unmasked.isMasked, false);
    assert.equal(unmasked.houseNumber, 'Flat 402, Block C');
    assert.equal(unmasked.street, 'Vibhuti Khand, Gomti Nagar');
    assert.equal(unmasked.locality, 'Sector 4');
    assert.equal(unmasked.city, 'Lucknow');
    assert.equal(unmasked.contactPhone, '+91 9876543210');
  });
});
