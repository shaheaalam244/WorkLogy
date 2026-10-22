/**
 * WorkLogy — getDisplayName Unit Tests
 * 
 * Verifies that getDisplayName safely handles:
 * - Plain string categories
 * - Populated Mongoose category objects ({ _id, slug, icon, name })
 * - Missing categories (undefined)
 * - Null categories
 * - Emergency requests with populated service data
 * - Complex objects, arrays, and fallbacks
 */

import assert from 'node:assert';
import { getDisplayName } from './formatters.js';

console.log('🧪 Starting getDisplayName Unit Tests...\n');

// 1. String category
{
  const result = getDisplayName('AC & HVAC Services');
  assert.strictEqual(result, 'AC & HVAC Services', 'Should return the category string intact');
  console.log('✅ Test 1 Passed: Plain string category handled correctly');
}

// 2. Populated category object with _id, slug, icon, and name (matches the crash object)
{
  const populatedCategory = {
    _id: '67b7f00123456789abcdef01',
    slug: 'ac-hvac-services',
    icon: 'Wrench',
    name: 'AC & HVAC Services'
  };
  const result = getDisplayName(populatedCategory);
  assert.strictEqual(result, 'AC & HVAC Services', 'Should extract name from populated category object');
  assert.strictEqual(typeof result, 'string', 'Result must be a primitive string, never an object');
  console.log('✅ Test 2 Passed: Populated category object with _id, slug, icon, and name handled correctly');
}

// 3. Missing category (undefined)
{
  const missingCategory = undefined;
  const result = getDisplayName(missingCategory);
  assert.strictEqual(result, '', 'Should return empty string for undefined');
  const fallbackResult = result || 'Emergency Maintenance';
  assert.strictEqual(fallbackResult, 'Emergency Maintenance', 'Fallback should resolve safely');
  console.log('✅ Test 3 Passed: Missing category (undefined) handled gracefully');
}

// 4. Null category
{
  const nullCategory = null;
  const result = getDisplayName(nullCategory);
  assert.strictEqual(result, '', 'Should return empty string for null');
  const fallbackResult = result || 'Emergency Maintenance';
  assert.strictEqual(fallbackResult, 'Emergency Maintenance', 'Fallback should resolve safely');
  console.log('✅ Test 4 Passed: Null category handled gracefully');
}

// 5. Emergency requests with populated service data
{
  const emergencyLead = {
    jobId: 'job_123456',
    title: 'Water pipe burst flooding kitchen',
    description: 'Urgent main supply pipe burst under sink',
    urgency: 'emergency',
    category: {
      _id: '67b7f99999999999abcdef99',
      slug: 'plumbing-services',
      icon: 'Droplet',
      name: 'Plumbing Services'
    },
    serviceCategory: {
      name: 'Plumbing Services',
      slug: 'plumbing-services'
    },
    service: {
      title: 'Pipe Leakage Repair',
      name: 'Emergency Plumbing'
    },
    location: {
      locality: 'Gomti Nagar',
      city: 'Lucknow'
    }
  };

  const rawCategory = 
    emergencyLead.category || 
    emergencyLead.serviceCategory || 
    emergencyLead.service || 
    emergencyLead.categoryName;

  const categoryName = getDisplayName(rawCategory) || 'Emergency Maintenance';
  assert.strictEqual(categoryName, 'Plumbing Services', 'Should resolve emergency category name');
  assert.strictEqual(typeof categoryName, 'string', 'Result must be string');
  console.log('✅ Test 5 Passed: Emergency lead with populated service data handled correctly');
}

// 6. Object with title or label instead of name
{
  const titleObj = { title: 'Appliance Repair' };
  assert.strictEqual(getDisplayName(titleObj), 'Appliance Repair');

  const labelObj = { label: 'Locksmith Services' };
  assert.strictEqual(getDisplayName(labelObj), 'Locksmith Services');
  console.log('✅ Test 6 Passed: Objects with title and label attributes handled correctly');
}

// 7. Array of category objects or strings
{
  const categoryArray = [
    { name: 'Electrical Services' },
    { name: 'Appliance Repair' }
  ];
  assert.strictEqual(getDisplayName(categoryArray), 'Electrical Services, Appliance Repair');
  console.log('✅ Test 7 Passed: Category arrays formatted as comma-separated string');
}

// 8. Unpopulated object without display keys (e.g. raw ObjectId object)
{
  const rawIdObj = { _id: '67b7f00123456789abcdef01' };
  assert.strictEqual(getDisplayName(rawIdObj), '', 'Should return empty string rather than rendering ObjectId');
  assert.strictEqual(getDisplayName(rawIdObj) || 'General Trade', 'General Trade');
  console.log('✅ Test 8 Passed: Unpopulated object without display keys handled gracefully with fallback');
}

// 9. Whitespace-padded string
{
  assert.strictEqual(getDisplayName('   Painting Services   '), 'Painting Services');
  console.log('✅ Test 9 Passed: Whitespace trimmed properly');
}

console.log('\n🎉 ALL 9 getDisplayName UNIT TESTS PASSED SUCCESSFULLY!\n');
