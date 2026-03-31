import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  Modal,
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { BASE_URL } from '../config/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import colors from '../theme/colors';
import spacing, { borderRadius } from '../theme/spacing';
import { fonts, fontSizes } from '../theme/typography';

const EMPTY_FORM = {
  promoCode: '',
  discountPercent: '',
  validUntil: '',
};

export default function AdminPromotionsScreen() {
  const { user, token } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null); // null = create mode
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);

  const authHeaders = { Authorization: `Bearer ${token}` };

  const fetchPromotions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/api/promotions`);
      setPromotions(res.data);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to load promotions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) fetchPromotions();
  }, [isAdmin, fetchPromotions]);

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.accessDenied}>Access denied. Admins only.</Text>
      </SafeAreaView>
    );
  }

  const openCreate = () => {
    setEditingPromo(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  };

  const openEdit = (promo) => {
    setEditingPromo(promo);
    setForm({
      promoCode: promo.promoCode,
      discountPercent: String(promo.discountPercent),
      validUntil: promo.validUntil ? promo.validUntil.slice(0, 10) : '',
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingPromo(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    const { promoCode, discountPercent, validUntil } = form;
    if (!promoCode.trim() || !discountPercent || !validUntil.trim()) {
      Alert.alert('Validation', 'All fields are required.');
      return;
    }
    const pct = Number(discountPercent);
    if (isNaN(pct) || pct < 1 || pct > 100) {
      Alert.alert('Validation', 'Discount must be between 1 and 100.');
      return;
    }
    // Basic date format check YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(validUntil.trim())) {
      Alert.alert('Validation', 'Date must be in YYYY-MM-DD format.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        promoCode: promoCode.trim().toUpperCase(),
        discountPercent: pct,
        validUntil: validUntil.trim(),
      };
      if (editingPromo) {
        await axios.put(`${BASE_URL}/api/promotions/${editingPromo._id}`, payload, { headers: authHeaders });
      } else {
        await axios.post(`${BASE_URL}/api/promotions`, payload, { headers: authHeaders });
      }
      closeModal();
      fetchPromotions();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to save promotion');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (promo) => {
    Alert.alert(
      'Delete Promotion',
      `Delete "${promo.promoCode}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${BASE_URL}/api/promotions/${promo._id}`, { headers: authHeaders });
              fetchPromotions();
            } catch (err) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to delete promotion');
            }
          },
        },
      ]
    );
  };

  const handleUploadBanner = async (promo) => {
    // expo-image-picker is not installed; show informational alert
    Alert.alert(
      'Upload Banner',
      'Image picker is not available in this build. To upload a banner, install expo-image-picker and call POST /api/promotions/' + promo._id + '/upload with a multipart/form-data request.',
      [{ text: 'OK' }]
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return dateStr.slice(0, 10);
  };

  const renderPromo = ({ item }) => (
    <Card style={styles.promoCard}>
      <View style={styles.promoHeader}>
        <Text style={styles.promoCode}>{item.promoCode}</Text>
        <Text style={styles.promoDiscount}>{item.discountPercent}% off</Text>
      </View>
      <Text style={styles.promoDate}>Valid until: {formatDate(item.validUntil)}</Text>
      {item.promoBannerUrl ? (
        <Text style={styles.bannerUrl} numberOfLines={1}>Banner: {item.promoBannerUrl}</Text>
      ) : null}
      <View style={styles.promoActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(item)}>
          <Text style={styles.actionBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.uploadBtn]} onPress={() => handleUploadBanner(item)}>
          <Text style={styles.actionBtnText}>Upload Banner</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(item)}>
          <Text style={[styles.actionBtnText, styles.deleteBtnText]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Promotions</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={promotions}
          keyExtractor={(item) => item._id}
          renderItem={renderPromo}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No promotions yet.</Text>}
        />
      )}

      {/* Add / Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>
                {editingPromo ? 'Edit Promotion' : 'New Promotion'}
              </Text>

              <Input
                label="Promo Code"
                placeholder="e.g. SUMMER20"
                value={form.promoCode}
                onChangeText={(v) => setForm((f) => ({ ...f, promoCode: v }))}
                autoCapitalize="characters"
              />
              <View style={styles.fieldGap} />

              <Input
                label="Discount (%)"
                placeholder="1 – 100"
                value={form.discountPercent}
                onChangeText={(v) => setForm((f) => ({ ...f, discountPercent: v }))}
                keyboardType="numeric"
              />
              <View style={styles.fieldGap} />

              <Input
                label="Valid Until"
                placeholder="YYYY-MM-DD"
                value={form.validUntil}
                onChangeText={(v) => setForm((f) => ({ ...f, validUntil: v }))}
                keyboardType="numbers-and-punctuation"
              />
              <View style={styles.fieldGap} />

              <Button
                title={saving ? 'Saving…' : editingPromo ? 'Save Changes' : 'Create Promotion'}
                onPress={handleSave}
                disabled={saving}
              />
              <View style={styles.fieldGap} />
              <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cream,
  },
  accessDenied: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.base,
    color: colors.dark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.xl,
    color: '#FFFFFF',
  },
  addBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.pill,
  },
  addBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.md,
    color: '#FFFFFF',
  },
  loader: {
    marginTop: spacing.xl,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  empty: {
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: fontSizes.base,
    color: colors.dark,
    marginTop: spacing.xl,
  },
  promoCard: {
    marginBottom: spacing.md,
  },
  promoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  promoCode: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.lg,
    color: colors.primary,
    letterSpacing: 1,
  },
  promoDiscount: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.base,
    color: colors.dark,
  },
  promoDate: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
    color: colors.dark,
    marginBottom: spacing.xs,
  },
  bannerUrl: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: '#888',
    marginBottom: spacing.xs,
  },
  promoActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
  },
  actionBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.pill,
  },
  uploadBtn: {
    backgroundColor: '#5A7A5A',
  },
  deleteBtn: {
    backgroundColor: '#E53E3E',
  },
  actionBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: '#FFFFFF',
  },
  deleteBtnText: {
    color: '#FFFFFF',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.cream,
    borderTopLeftRadius: borderRadius.cardLg,
    borderTopRightRadius: borderRadius.cardLg,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '85%',
  },
  modalTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSizes['2xl'],
    color: colors.dark,
    marginBottom: spacing.lg,
  },
  fieldGap: {
    height: spacing.md,
  },
  cancelBtn: {
    height: 52,
    width: '100%',
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  cancelBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.base,
    color: colors.primary,
    letterSpacing: 0.3,
  },
});
