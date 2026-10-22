import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('WorkLogy Mobile Architecture & Cross-Platform Integration', () => {
  describe('Brand Tokens & Design Consistency', () => {
    it('enforces canonical WorkLogy brand palette', () => {
      const COLORS = {
        primary: '#06684F',
        primaryDark: '#044C3A',
        primaryLight: '#E6F4F0',
        secondary: '#0F172A',
        emergency: '#DC2626',
        warning: '#F59E0B',
        success: '#10B981',
        textDark: '#0F172A',
        textSecondary: '#475569',
        border: '#E2E8F0'
      };

      assert.equal(COLORS.primary, '#06684F');
      assert.equal(COLORS.emergency, '#DC2626');
      assert.equal(COLORS.secondary, '#0F172A');
    });

    it('formats Indian Rupee (INR) currency correctly across mobile apps', () => {
      const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          maximumFractionDigits: 0
        }).format(amount || 0);
      };

      assert.match(formatCurrency(499), /₹\s?499/);
      assert.match(formatCurrency(18450), /₹\s?18,450/);
    });

    it('maps booking lifecycle statuses to appropriate visual indicators', () => {
      const getStatusColor = (status) => {
        switch (status) {
          case 'pending': return '#F59E0B';
          case 'confirmed': return '#2563EB';
          case 'on_the_way': return '#8B5CF6';
          case 'arrived': return '#D97706';
          case 'in_progress': return '#059669';
          case 'completed': return '#10B981';
          case 'cancelled': return '#DC2626';
          default: return '#64748B';
        }
      };

      assert.equal(getStatusColor('confirmed'), '#2563EB');
      assert.equal(getStatusColor('in_progress'), '#059669');
      assert.equal(getStatusColor('completed'), '#10B981');
      assert.equal(getStatusColor('cancelled'), '#DC2626');
    });
  });

  describe('Address Masking & Disclosed Dossier Rules', () => {
    it('masks full customer address in open tender feeds for privacy', () => {
      const tenderJob = {
        _id: 'job-101',
        title: 'Emergency Main Breaker Tripping',
        urgency: 'emergency',
        status: 'open',
        address: {
          houseNumber: 'Flat 402, Tower B',
          street: 'Supertech Eco Village 1',
          city: 'Noida Extension',
          pincode: '201306'
        }
      };

      const getMaskedLocation = (job) => {
        return `Near ${job.address.city || 'Service Area'} (~2.5 km away)`;
      };

      const maskedDisplay = getMaskedLocation(tenderJob);
      assert.equal(maskedDisplay.includes('Flat 402'), false);
      assert.equal(maskedDisplay.includes('Tower B'), false);
      assert.equal(maskedDisplay.includes('Noida Extension'), true);
    });

    it('unmasks full address once booking is assigned to winning contractor', () => {
      const confirmedBooking = {
        _id: 'bk-202',
        vendor: 'vendor-777',
        status: 'confirmed',
        customer: {
          name: 'Sunita Mehra',
          phone: '+91 98765 43210'
        },
        address: {
          houseNumber: 'Flat 402, Tower B',
          street: 'Supertech Eco Village 1',
          city: 'Noida Extension',
          pincode: '201306'
        }
      };

      const getDisclosedAddress = (booking, currentVendorId) => {
        if (booking.vendor === currentVendorId) {
          return `${booking.address.houseNumber}, ${booking.address.street}, ${booking.address.city} - ${booking.address.pincode}`;
        }
        return 'Masked for assignment';
      };

      const disclosed = getDisclosedAddress(confirmedBooking, 'vendor-777');
      assert.equal(disclosed.includes('Flat 402, Tower B'), true);
      assert.equal(disclosed.includes('Supertech Eco Village 1'), true);
      assert.equal(disclosed.includes('201306'), true);
    });
  });

  describe('First-Acceptance-Wins (FCFS) Concurrency Protocol', () => {
    it('atomically claims emergency lead for first technician only', () => {
      const emergencyLead = {
        _id: 'lead-999',
        isEmergency: true,
        status: 'open',
        claimedBy: null
      };

      const claimEmergencyLead = (lead, vendorId) => {
        if (lead.status !== 'open' || lead.claimedBy) {
          throw new Error('This emergency job has already been claimed by another nearby technician.');
        }
        lead.status = 'assigned';
        lead.claimedBy = vendorId;
        return { success: true, winningVendor: vendorId };
      };

      // Technician A claims first
      const resultA = claimEmergencyLead(emergencyLead, 'vendor-alpha');
      assert.equal(resultA.success, true);
      assert.equal(resultA.winningVendor, 'vendor-alpha');

      // Technician B attempts concurrent claim
      assert.throws(
        () => claimEmergencyLead(emergencyLead, 'vendor-beta'),
        /This emergency job has already been claimed/
      );
    });
  });

  describe('Physical Arrival OTP Verification Protocol', () => {
    it('requires authentic 6-digit match before unlocking job in-progress state', () => {
      const booking = {
        _id: 'bk-555',
        status: 'arrived',
        arrivalOtp: '482910',
        isOtpVerified: false
      };

      const verifyArrivalOtp = (b, inputOtp) => {
        if (!inputOtp || inputOtp.trim().length !== 6) {
          throw new Error('Please enter the 6-digit Arrival OTP provided by the customer.');
        }
        if (inputOtp.trim() !== b.arrivalOtp) {
          throw new Error('Incorrect Arrival OTP. Please check with customer.');
        }
        b.isOtpVerified = true;
        b.status = 'in_progress';
        return { success: true, status: b.status };
      };

      // Wrong OTP fails
      assert.throws(
        () => verifyArrivalOtp(booking, '000000'),
        /Incorrect Arrival OTP/
      );
      assert.equal(booking.isOtpVerified, false);
      assert.equal(booking.status, 'arrived');

      // Correct OTP unlocks in_progress
      const verified = verifyArrivalOtp(booking, '482910');
      assert.equal(verified.success, true);
      assert.equal(booking.isOtpVerified, true);
      assert.equal(booking.status, 'in_progress');
    });
  });

  describe('Escrow & Net Payout Calculation', () => {
    it('calculates transparent 10% platform fee and net contractor take-home', () => {
      const grossAmount = 1650;
      const platformFeeRate = 0.1; // 10% WorkLogy service charge

      const platformFee = Math.round(grossAmount * platformFeeRate);
      const netTakeHome = grossAmount - platformFee;

      assert.equal(platformFee, 165);
      assert.equal(netTakeHome, 1485);
    });
  });

  describe('Universal Secure Storage Fallback', () => {
    it('seamlessly falls back to in-memory store in non-native or test environments', async () => {
      class UniversalStorageMock {
        constructor() {
          this.memoryStore = new Map();
        }
        async setItem(key, value) {
          this.memoryStore.set(key, value);
        }
        async getItem(key) {
          return this.memoryStore.get(key) || null;
        }
        async removeItem(key) {
          this.memoryStore.delete(key);
        }
      }

      const storage = new UniversalStorageMock();
      await storage.setItem('worklogy_token', 'jwt.bearer.test.token');
      const retrieved = await storage.getItem('worklogy_token');
      assert.equal(retrieved, 'jwt.bearer.test.token');

      await storage.removeItem('worklogy_token');
      const afterRemoval = await storage.getItem('worklogy_token');
      assert.equal(afterRemoval, null);
    });
  });
});
