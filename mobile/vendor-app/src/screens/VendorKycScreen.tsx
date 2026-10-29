import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { COLORS } from '../theme/colors';

interface VerificationDoc {
  name: string;
  docType: string;
  url: string;
  uploadedAt?: string;
  maskedId?: string;
  status?: string;
}

export default function VendorKycScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0
  );

  const [loading, setLoading] = useState(true);
  const [verificationData, setVerificationData] = useState<any | null>(null);

  // Add Document Modal
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [docType, setDocType] = useState<'Aadhaar Card' | 'PAN Card' | 'Trade License' | 'Voter ID'>('Aadhaar Card');
  const [idNumber, setIdNumber] = useState('');
  const [selectedFileUri, setSelectedFileUri] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [consent, setConsent] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Document Viewer Modal
  const [previewDoc, setPreviewDoc] = useState<VerificationDoc | null>(null);

  useEffect(() => {
    loadKycStatus();
  }, []);

  const loadKycStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.vendors.getVerificationStatus();
      if (res?.verification) {
        setVerificationData(res.verification);
      }
    } catch (err) {
      console.warn('Failed to load KYC status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePickDocument = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please grant photo library access to upload documents.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.85
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const asset = result.assets[0];
      setSelectedFileUri(asset.uri);
      const filename = asset.uri.split('/').pop() || `${docType.replace(/\s+/g, '_')}.jpg`;
      setSelectedFileName(filename);
    } catch (err: any) {
      Alert.alert('File Selection Failed', err.message);
    }
  };

  const validateDocNumber = (type: string, num: string): { valid: boolean; error?: string } => {
    const trimmed = num.trim();
    if (!trimmed) {
      return { valid: false, error: `Please enter your ${type} number.` };
    }
    if (type === 'Aadhaar Card') {
      const cleanDigits = trimmed.replace(/\D/g, '');
      if (cleanDigits.length !== 12) {
        return { valid: false, error: 'Aadhaar number must be exactly 12 numeric digits.' };
      }
    } else if (type === 'PAN Card') {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/i;
      if (!panRegex.test(trimmed)) {
        return { valid: false, error: 'PAN number must be 10 characters (e.g. ABCDE1234F).' };
      }
    } else if (type === 'Voter ID') {
      if (trimmed.length < 6 || trimmed.length > 20) {
        return { valid: false, error: 'Please enter a valid Voter ID (EPIC) number.' };
      }
    } else if (type === 'Trade License') {
      if (trimmed.length < 4 || trimmed.length > 30) {
        return { valid: false, error: 'Please enter a valid Trade License / Registration number.' };
      }
    }
    return { valid: true };
  };

  const handleSubmitDocument = async () => {
    if (uploading) return;

    if (!selectedFileUri) {
      Alert.alert('Document Required', 'Please select a photo or scan of your document from your device.');
      return;
    }

    const valResult = validateDocNumber(docType, idNumber);
    if (!valResult.valid) {
      Alert.alert('Invalid Document Number', valResult.error || `Please enter a valid ${docType} number.`);
      return;
    }

    if (!consent) {
      Alert.alert('Consent Required', 'Please check the box to consent to credential verification.');
      return;
    }

    try {
      setUploading(true);

      // Determine correct MIME type
      const lowerUri = (selectedFileName || selectedFileUri).toLowerCase();
      let detectedMime = 'image/jpeg';
      if (lowerUri.endsWith('.png')) detectedMime = 'image/png';
      else if (lowerUri.endsWith('.webp')) detectedMime = 'image/webp';
      else if (lowerUri.endsWith('.pdf')) detectedMime = 'application/pdf';

      // 1. Upload file via native multipart upload
      const uploadRes = await api.media.uploadImage(
        selectedFileUri,
        detectedMime,
        selectedFileName || `${docType.replace(/\s+/g, '_')}_Document.jpg`
      );

      if (!uploadRes?.url) {
        throw new Error('Document upload failed. Server did not return a valid file URL.');
      }

      // 2. Submit KYC verification record to backend
      const res = await api.vendors.requestVerification({
        verificationType: docType,
        idNumber: idNumber.trim(),
        consent: true,
        documents: [
          {
            name: selectedFileName || `${docType.replace(/\s+/g, '_')}_Document.jpg`,
            url: uploadRes.url,
            type: 'identity'
          }
        ]
      });

      if (!res?.success) {
        throw new Error(res?.message || 'Verification submission could not be processed.');
      }

      Alert.alert(
        'Submission Received! 📄',
        'Your document has been securely submitted to the compliance team for review.'
      );

      // 3. Reset form on success and refresh status from database
      setUploadModalOpen(false);
      setSelectedFileUri(null);
      setSelectedFileName('');
      setIdNumber('');
      await loadKycStatus();
    } catch (err: any) {
      Alert.alert('Submission Error', err?.message || 'Could not submit verification document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const isVerified =
    verificationData?.status === 'verified' ||
    verificationData?.status === 'approved';

  const isPending =
    verificationData?.status === 'submitted' ||
    verificationData?.status === 'under_review' ||
    verificationData?.status === 'pending_review' ||
    verificationData?.status === 'pending';

  const isRejected =
    verificationData?.status === 'rejected';

  const isChangesRequired =
    verificationData?.status === 'changes_required' ||
    verificationData?.status === 'resubmission_required';

  const submittedDocs: VerificationDoc[] =
    verificationData?.documents && verificationData.documents.length > 0
      ? verificationData.documents.map((d: any) => ({
          name: d.name || 'Verification Document',
          docType: d.docType || 'identity',
          url: d.url,
          uploadedAt: d.uploadedAt,
          maskedId: verificationData.maskedIdNumber || 'XXXX-XXXX-****',
          status: isVerified
            ? 'Verified'
            : isPending
            ? 'Under Review'
            : isRejected
            ? 'Rejected'
            : isChangesRequired
            ? 'Changes Required'
            : 'Submitted'
        }))
      : [];

  return (
    <View style={styles.screenWrapper}>
      {/* ── TOP HEADER ── */}
      <View style={[styles.headerBar, { paddingTop: topInset + 6 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>KYC Verification</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#06684F" />
          <Text style={{ marginTop: 10, color: '#64748B', fontSize: 13 }}>Loading verification data...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── TOP BANNER ── */}
          <View
            style={[
              styles.statusBanner,
              isVerified
                ? styles.statusBannerVerified
                : isPending
                ? styles.statusBannerPending
                : isRejected
                ? styles.statusBannerRejected
                : isChangesRequired
                ? styles.statusBannerPending
                : styles.statusBannerDefault
            ]}
          >
            <View
              style={[
                styles.statusIconWrap,
                isVerified
                  ? styles.statusIconVerified
                  : isPending
                  ? styles.statusIconPending
                  : isRejected
                  ? styles.statusIconRejected
                  : styles.statusIconDefault
              ]}
            >
              <Ionicons
                name={
                  isVerified
                    ? 'shield-checkmark'
                    : isPending
                    ? 'time'
                    : isRejected
                    ? 'close-circle'
                    : isChangesRequired
                    ? 'alert-circle'
                    : 'shield-outline'
                }
                size={26}
                color={
                  isVerified
                    ? '#06684F'
                    : isPending
                    ? '#D97706'
                    : isRejected
                    ? '#DC2626'
                    : isChangesRequired
                    ? '#D97706'
                    : '#64748B'
                }
              />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.statusTitle}>
                {isVerified
                  ? 'Verified Vendor'
                  : isPending
                  ? 'Verification Under Review'
                  : isRejected
                  ? 'Verification Rejected'
                  : isChangesRequired
                  ? 'Resubmission Required'
                  : 'Get Verified'}
              </Text>
              <Text style={styles.statusSubtitle}>
                {isVerified
                  ? 'Your identity has been verified by the WorkLogy compliance team.'
                  : isPending
                  ? 'Our compliance team is currently reviewing your documents.'
                  : isRejected
                  ? verificationData?.rejectionReason || 'Your document verification was rejected. Please review guidelines and submit valid documents.'
                  : isChangesRequired
                  ? verificationData?.resubmissionInstructions || 'Changes are required on your submitted documents. Please upload updated files.'
                  : 'Submit government-issued ID to unlock verified badge and customer trust.'}
              </Text>
            </View>
          </View>

          {/* ── SUBMITTED DOCUMENTS SECTION ── */}
          <Text style={styles.sectionHeading}>Submitted Documents</Text>

          {submittedDocs.length === 0 ? (
            <View style={styles.emptyDocsBox}>
              <Ionicons name="document-text-outline" size={36} color="#94A3B8" />
              <Text style={styles.emptyDocsTitle}>No Documents Submitted Yet</Text>
              <Text style={styles.emptyDocsSub}>
                Upload your Aadhaar Card, PAN Card, Voter ID, or Trade License to begin verification.
              </Text>
            </View>
          ) : (
            submittedDocs.map((doc, idx) => (
              <View key={idx} style={styles.docCard}>
                <View style={styles.docThumbnailBox}>
                  <Ionicons
                    name={doc.url?.toLowerCase()?.includes('.pdf') ? 'document-attach' : 'document-text'}
                    size={24}
                    color="#06684F"
                  />
                </View>

                <View style={styles.docDetailsCol}>
                  <Text style={styles.docName} numberOfLines={1}>{doc.name}</Text>
                  <Text style={styles.docMaskedId}>{doc.maskedId}</Text>
                  <View style={styles.docStatusRow}>
                    <View
                      style={[
                        styles.verifiedDocPill,
                        doc.status === 'Verified'
                          ? styles.pillVerified
                          : doc.status === 'Under Review'
                          ? styles.pillPending
                          : doc.status === 'Rejected'
                          ? styles.pillRejected
                          : styles.pillDefault
                      ]}
                    >
                      <Ionicons
                        name={
                          doc.status === 'Verified'
                            ? 'checkmark-circle'
                            : doc.status === 'Under Review'
                            ? 'time'
                            : doc.status === 'Rejected'
                            ? 'close-circle'
                            : 'information-circle'
                        }
                        size={12}
                        color={
                          doc.status === 'Verified'
                            ? '#059669'
                            : doc.status === 'Under Review'
                            ? '#D97706'
                            : doc.status === 'Rejected'
                            ? '#DC2626'
                            : '#2563EB'
                        }
                      />
                      <Text
                        style={[
                          styles.verifiedDocPillText,
                          doc.status === 'Verified'
                            ? { color: '#059669' }
                            : doc.status === 'Under Review'
                            ? { color: '#D97706' }
                            : doc.status === 'Rejected'
                            ? { color: '#DC2626' }
                            : { color: '#2563EB' }
                        ]}
                      >
                        {doc.status}
                      </Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.viewDocBtn}
                  onPress={() => setPreviewDoc(doc)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.viewDocBtnText}>View</Text>
                </TouchableOpacity>
              </View>
            ))
          )}

          {/* ── ADD NEW DOCUMENT BUTTON ── */}
          <TouchableOpacity
            style={styles.addDocOutlineBtn}
            onPress={() => setUploadModalOpen(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color="#06684F" />
            <Text style={styles.addDocOutlineBtnText}>Add New Document</Text>
          </TouchableOpacity>

          {/* ── PRIVACY FOOTER NOTE ── */}
          <View style={styles.privacyNoteBox}>
            <Ionicons name="lock-closed-outline" size={16} color="#64748B" style={{ marginTop: 2 }} />
            <Text style={styles.privacyNoteText}>
              Your documents are stored securely and only used for verification purposes.
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ── UPLOAD DOCUMENT MODAL ── */}
      <Modal visible={uploadModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload Verification Document</Text>
              <TouchableOpacity onPress={() => setUploadModalOpen(false)}>
                <Ionicons name="close" size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Select Doc Type */}
              <Text style={styles.inputLabel}>Document Type</Text>
              <View style={styles.typeSelectorRow}>
                {(['Aadhaar Card', 'PAN Card', 'Trade License', 'Voter ID'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typePill, docType === type && styles.typePillActive]}
                    onPress={() => setDocType(type)}
                  >
                    <Text style={[styles.typePillText, docType === type && styles.typePillTextActive]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* ID Number Input */}
              <Text style={styles.inputLabel}>{docType} Number</Text>
              <TextInput
                style={styles.textInput}
                value={idNumber}
                onChangeText={setIdNumber}
                placeholder={
                  docType === 'Aadhaar Card'
                    ? 'Enter 12-digit Aadhaar number exactly as printed on card'
                    : docType === 'PAN Card'
                    ? 'Enter 10-character PAN number (e.g. ABCDE1234F)'
                    : docType === 'Voter ID'
                    ? 'Enter Voter ID (EPIC) number exactly as printed'
                    : 'Enter Trade License or registration number'
                }
                placeholderTextColor="#94A3B8"
                keyboardType={docType === 'Aadhaar Card' ? 'numeric' : 'default'}
                autoCapitalize={docType === 'PAN Card' ? 'characters' : 'none'}
                maxLength={docType === 'Aadhaar Card' ? 12 : docType === 'PAN Card' ? 10 : 35}
                autoCorrect={false}
              />

              {/* File Attachment */}
              <Text style={styles.inputLabel}>Document Photo / Scan</Text>
              <TouchableOpacity
                style={styles.filePickerBox}
                onPress={handlePickDocument}
                activeOpacity={0.8}
              >
                {selectedFileUri ? (
                  <View style={styles.fileSelectedRow}>
                    <Ionicons name="checkmark-circle" size={20} color="#059669" />
                    <Text style={styles.selectedFileName} numberOfLines={1}>{selectedFileName}</Text>
                    <Text style={{ fontSize: 12, color: '#06684F', fontWeight: '700' }}>Change</Text>
                  </View>
                ) : (
                  <View style={{ alignItems: 'center' }}>
                    <Ionicons name="cloud-upload-outline" size={28} color="#06684F" />
                    <Text style={styles.filePickerText}>Select Document from Device</Text>
                    <Text style={styles.filePickerSub}>JPG, PNG, or PDF up to 10MB</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Statutory Consent */}
              <TouchableOpacity
                style={styles.consentRow}
                onPress={() => setConsent(!consent)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={consent ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={consent ? '#06684F' : '#94A3B8'}
                />
                <Text style={styles.consentText}>
                  I consent to WorkLogy verifying my credential details with government registries for platform compliance.
                </Text>
              </TouchableOpacity>

              {/* Submit Button */}
              <TouchableOpacity
                style={styles.submitModalBtn}
                onPress={handleSubmitDocument}
                disabled={uploading}
                activeOpacity={0.85}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitModalBtnText}>Submit for Verification</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── DOCUMENT VIEWER MODAL ── */}
      <Modal visible={!!previewDoc} transparent animationType="fade">
        <View style={styles.viewerOverlay}>
          <View style={styles.viewerCard}>
            <View style={styles.viewerHeader}>
              <Text style={styles.viewerTitle}>{previewDoc?.name}</Text>
              <TouchableOpacity onPress={() => setPreviewDoc(null)}>
                <Ionicons name="close" size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {previewDoc?.url && !previewDoc.url.toLowerCase().includes('.pdf') ? (
              <Image
                source={{ uri: previewDoc.url }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.previewPlaceholder}>
                <Ionicons
                  name={previewDoc?.url?.toLowerCase()?.includes('.pdf') ? 'document-attach' : 'document-text'}
                  size={48}
                  color="#06684F"
                />
                <Text style={{ marginTop: 10, color: '#334155', fontWeight: '600', fontSize: 14 }}>
                  {previewDoc?.url?.toLowerCase()?.includes('.pdf')
                    ? 'PDF Document Verified & Stored'
                    : 'Document on file (Encrypted)'}
                </Text>
                <Text style={{ marginTop: 4, color: '#64748B', fontSize: 12 }}>
                  Securely stored on WorkLogy compliance servers
                </Text>
              </View>
            )}

            <View style={styles.viewerFooter}>
              <Text style={styles.viewerMeta}>
                Status: {previewDoc?.status || 'Verified'} • {previewDoc?.maskedId || 'XXXX-XXXX-4321'}
              </Text>
              <TouchableOpacity
                style={styles.viewerCloseBtn}
                onPress={() => setPreviewDoc(null)}
              >
                <Text style={styles.viewerCloseBtnText}>Close Preview</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  headerBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A'
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  scroll: {
    flex: 1
  },
  scrollContent: {
    padding: 16
  },

  // ── Top Banner ──
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1
  },
  statusBannerVerified: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0'
  },
  statusBannerPending: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A'
  },
  statusBannerRejected: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA'
  },
  statusBannerDefault: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0'
  },
  statusIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center'
  },
  statusIconVerified: {
    backgroundColor: '#D1FAE5'
  },
  statusIconPending: {
    backgroundColor: '#FEF3C7'
  },
  statusIconRejected: {
    backgroundColor: '#FEE2E2'
  },
  statusIconDefault: {
    backgroundColor: '#F1F5F9'
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2
  },
  statusSubtitle: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16
  },

  // ── Section ──
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10
  },
  emptyDocsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16
  },
  emptyDocsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 10,
    marginBottom: 4
  },
  emptyDocsSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1
  },
  docThumbnailBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1FAE5'
  },
  docDetailsCol: {
    flex: 1,
    marginLeft: 12
  },
  docName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A'
  },
  docMaskedId: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2
  },
  docStatusRow: {
    marginTop: 4
  },
  verifiedDocPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    gap: 3,
    borderWidth: 1
  },
  pillVerified: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0'
  },
  pillPending: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A'
  },
  pillRejected: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA'
  },
  pillDefault: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0'
  },
  verifiedDocPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669'
  },
  viewDocBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF'
  },
  viewDocBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155'
  },

  // ── Add Doc Outline Button ──
  addDocOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#06684F',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 20,
    gap: 6
  },
  addDocOutlineBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#06684F'
  },

  // ── Privacy Note ──
  privacyNoteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 12,
    gap: 8
  },
  privacyNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16
  },

  // ── Modal Sheet ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end'
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '88%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A'
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10
  },
  typeSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6
  },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  typePillActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#06684F'
  },
  typePillText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600'
  },
  typePillTextActive: {
    color: '#06684F',
    fontWeight: '700'
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A'
  },
  filePickerBox: {
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  filePickerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#06684F',
    marginTop: 6
  },
  filePickerSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2
  },
  fileSelectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  selectedFileName: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
    maxWidth: '70%'
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 14,
    gap: 8
  },
  consentText: {
    flex: 1,
    fontSize: 11,
    color: '#475569',
    lineHeight: 16
  },
  submitModalBtn: {
    backgroundColor: '#06684F',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 20
  },
  submitModalBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF'
  },

  // ── Document Viewer ──
  viewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  viewerCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    maxHeight: '80%'
  },
  viewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  viewerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A'
  },
  previewImage: {
    width: '100%',
    height: 240,
    borderRadius: 10,
    backgroundColor: '#F8FAFC'
  },
  previewPlaceholder: {
    width: '100%',
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10
  },
  viewerFooter: {
    marginTop: 14
  },
  viewerMeta: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12
  },
  viewerCloseBtn: {
    backgroundColor: '#06684F',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center'
  },
  viewerCloseBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13
  }
});
