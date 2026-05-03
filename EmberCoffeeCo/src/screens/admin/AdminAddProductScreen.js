import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  StatusBar,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL } from '../../config/api';
import colors from '../../theme/colors';
import { fonts, fontSizes } from '../../theme/typography';
import spacing, { borderRadius } from '../../theme/spacing';

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = ['Coffee', 'Espresso', 'Tea', 'Pastries', 'Signature Brews'];

const ADMIN_TABS = [
  {
    key: 'Dashboard',
    label: 'Dashboard',
    selected:   'https://res.cloudinary.com/dqjzgnghk/image/upload/v1775210244/dashboard_icon_selected_twkuel.png',
    unselected: 'https://res.cloudinary.com/dqjzgnghk/image/upload/v1775210249/dashboard_icon_non-selected_f59pd7.png',
  },
  {
    key: 'Products',
    label: 'Products',
    selected:   'https://res.cloudinary.com/dqjzgnghk/image/upload/v1775210245/products_icon_selected_mqk0nn.png',
    unselected: 'https://res.cloudinary.com/dqjzgnghk/image/upload/v1775210245/products_icon_non-selected_vhus3q.png',
  },
  {
    key: 'Orders',
    label: 'Orders',
    selected:   'https://res.cloudinary.com/dqjzgnghk/image/upload/v1775210247/orders_icon_selected_lcallq.png',
    unselected: 'https://res.cloudinary.com/dqjzgnghk/image/upload/v1775210248/orders_icon_non-selected_jtq6bc.png',
  },
  {
    key: 'Rewards',
    label: 'Rewards',
    selected:   'https://res.cloudinary.com/dqjzgnghk/image/upload/v1775210246/rewards_icon_selected_xb64mi.png',
    unselected: 'https://res.cloudinary.com/dqjzgnghk/image/upload/v1775210246/rewards_icon_non-selected_a7bi00.png',
  },
  {
    key: 'Promotions',
    label: 'Promos',
    selected:   'https://res.cloudinary.com/dqjzgnghk/image/upload/v1775210245/Promos_icon_opd7er.png',
    unselected: 'https://res.cloudinary.com/dqjzgnghk/image/upload/v1775210245/Promos_icon_opd7er.png',
  },
];

// ─── Admin BottomNavBar ───────────────────────────────────────────────────────
function AdminBottomNavBar({ activeTab, onTabPress }) {
  return (
    <View style={navStyles.bar}>
      {ADMIN_TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={navStyles.tab}
            onPress={() => onTabPress && onTabPress(tab.key)}
            activeOpacity={0.7}
          >
            <Image
              source={{ uri: isActive ? tab.selected : tab.unselected }}
              style={navStyles.icon}
              resizeMode="contain"
            />
            <Text style={[navStyles.label, isActive ? navStyles.labelActive : navStyles.labelInactive]}>
              {tab.label}
            </Text>
            {isActive ? <View style={navStyles.activeDot} /> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const navStyles = StyleSheet.create({
  bar: {
    height: 64,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#FFFFFF',
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 6 },
  icon: { width: 24, height: 24 },
  label: { fontFamily: fonts.semiBold, fontSize: 9, marginTop: 3 },
  labelActive: { color: colors.primary },
  labelInactive: { color: '#9E9E9E' },
  activeDot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: colors.primary, marginTop: 2,
  },
});

// ─── Category Dropdown ────────────────────────────────────────────────────────
function CategoryDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <TouchableOpacity
        style={dropStyles.trigger}
        onPress={() => setOpen((o) => !o)}
        activeOpacity={0.8}
      >
        <Text style={[dropStyles.triggerText, !value && dropStyles.placeholder]}>
          {value || 'Select category'}
        </Text>
        <Text style={dropStyles.chevron}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={dropStyles.menu}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[dropStyles.option, value === cat && dropStyles.optionActive]}
              onPress={() => { onChange(cat); setOpen(false); }}
              activeOpacity={0.8}
            >
              <Text style={[dropStyles.optionText, value === cat && dropStyles.optionTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const dropStyles = StyleSheet.create({
  trigger: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: borderRadius.input,
    borderWidth: 1,
    borderColor: 'rgba(98,55,30,0.2)',
    paddingHorizontal: spacing.md,
  },
  triggerText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
    color: colors.dark,
  },
  placeholder: { color: '#A0856E' },
  chevron: { fontSize: 12, color: colors.primary },
  menu: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.input,
    borderWidth: 1,
    borderColor: 'rgba(98,55,30,0.15)',
    marginTop: 4,
    overflow: 'hidden',
    shadowColor: colors.dark,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 100,
  },
  option: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(98,55,30,0.06)',
  },
  optionActive: { backgroundColor: colors.accent },
  optionText: { fontFamily: fonts.regular, fontSize: fontSizes.md, color: colors.dark },
  optionTextActive: { fontFamily: fonts.semiBold, color: colors.primary },
});

// ─── Glassmorphism Preview Card ───────────────────────────────────────────────
function PreviewCard({ imageUri, name, price, isAvailable }) {
  return (
    <View style={previewStyles.card}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={previewStyles.image} />
      ) : (
        <View style={[previewStyles.image, previewStyles.imagePlaceholder]}>
          <Text style={previewStyles.placeholderIcon}>☕</Text>
        </View>
      )}
      {/* Glass overlay */}
      <View style={previewStyles.overlay}>
        <Text style={previewStyles.productName} numberOfLines={1}>
          {name || 'Product Name'}
        </Text>
        <View style={previewStyles.priceRow}>
          <Text style={previewStyles.price}>
            Rs. {price ? parseFloat(price).toFixed(2) : '0.00'}
          </Text>
          <View style={[
            previewStyles.badge,
            isAvailable ? previewStyles.badgeAvail : previewStyles.badgeUnavail,
          ]}>
            <Text style={previewStyles.badgeText}>
              {isAvailable ? 'Available' : 'Unavailable'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const previewStyles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.cardLg,
    overflow: 'hidden',
    height: 200,
    backgroundColor: colors.accent,
  },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0D5C0',
  },
  placeholderIcon: { fontSize: 56 },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(46,21,0,0.55)',
    padding: spacing.md,
  },
  productName: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.base,
    color: '#fff',
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontFamily: fonts.extraBold,
    fontSize: fontSizes.lg,
    color: colors.accent,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.pill,
  },
  badgeAvail: { backgroundColor: 'rgba(46,125,50,0.85)' },
  badgeUnavail: { backgroundColor: 'rgba(198,40,40,0.85)' },
  badgeText: { fontFamily: fonts.semiBold, fontSize: fontSizes.xs, color: '#fff' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AdminAddProductScreen({ navigation, route }) {
  const { user, token } = useAuth();
  const editProduct = route?.params?.product ?? null;
  const isEditMode = !!editProduct;

  // Form state
  const [productName, setProductName] = useState(editProduct?.productName ?? '');
  const [category, setCategory]       = useState(editProduct?.category ?? '');
  const [price, setPrice]             = useState(editProduct?.price ? String(editProduct.price) : '');
  const [description, setDescription] = useState(editProduct?.description ?? '');
  const [isAvailable, setIsAvailable] = useState(editProduct?.isAvailable ?? true);
  const [imageUri, setImageUri]       = useState(editProduct?.productImageUrl ?? null);
  const [imageFile, setImageFile]     = useState(null); // local picked file

  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  // ── Image Picker ─────────────────────────────────────────────────────────
  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length > 0) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      setImageFile(asset);
    }
  };

  // ── Upload image to server ────────────────────────────────────────────────
  const uploadImage = async (productId) => {
    if (!imageFile) return;
    const formData = new FormData();
    const filename = imageFile.uri.split('/').pop();
    const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
    formData.append('image', { uri: imageFile.uri, name: filename, type: mimeType });
    await axios.post(
      `${BASE_URL}/api/products/${productId}/upload`,
      formData,
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
    );
  };

  // ── Validate ─────────────────────────────────────────────────────────────
  const validate = () => {
    if (!productName.trim()) { Alert.alert('Validation', 'Product name is required.'); return false; }
    if (!category)           { Alert.alert('Validation', 'Please select a category.'); return false; }
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) < 0) {
      Alert.alert('Validation', 'Please enter a valid price.');
      return false;
    }
    return true;
  };

  // ── Save (create or update) ───────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        productName: productName.trim(),
        category,
        price: parseFloat(price),
        description: description.trim(),
        isAvailable,
      };

      let savedProduct;
      if (isEditMode) {
        if (!editProduct?._id) {
          Alert.alert('Error', 'Cannot update: product ID is missing.');
          setSaving(false);
          return;
        }
        console.log('[AdminAddProduct] PUT /api/products/' + editProduct._id, payload);
        const res = await axios.put(`${BASE_URL}/api/products/${editProduct._id}`, payload, authHeader);
        savedProduct = res.data;
      } else {
        const res = await axios.post(`${BASE_URL}/api/products`, payload, authHeader);
        savedProduct = res.data;
      }

      // Upload image if a new one was picked
      if (imageFile) {
        await uploadImage(savedProduct._id);
      }

      Alert.alert('Success', isEditMode ? 'Product updated.' : 'Product created.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = () => {
    if (!isEditMode) return;
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${editProduct.productName}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await axios.delete(`${BASE_URL}/api/products/${editProduct._id}`, authHeader);
              navigation.goBack();
            } catch (err) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to delete product.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  // ── Admin tab navigation ──────────────────────────────────────────────────
  const handleAdminTabPress = (tab) => {
    const routeMap = {
      Dashboard:  'AdminDashboard',
      Products:   'AdminProducts',
      Orders:     'AdminOrders',
      Rewards:    'AdminRewards',
      Promotions: 'AdminPromotions',
    };
    const route = routeMap[tab];
    if (route) navigation.navigate(route);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.cream} />

      {/* ── TopAppBar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Product Editor</Text>
        <View style={styles.avatarCircle}>
          {user?.profileImageUrl ? (
            <Image source={{ uri: user.profileImageUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarInitial}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </Text>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Sidebar / Preview Section ── */}
        <View style={styles.sidebarSection}>
          <Text style={styles.sidebarHeading}>Product Editor</Text>
          <Text style={styles.sidebarSubtitle}>
            {isEditMode ? 'Update product details below.' : 'Fill in the details to add a new product.'}
          </Text>

          {/* Glassmorphism preview card */}
          <PreviewCard
            imageUri={imageUri}
            name={productName}
            price={price}
            isAvailable={isAvailable}
          />

          {/* Live update notice */}
          <View style={styles.infoCard}>
            <Text style={styles.infoCardIcon}>⚡</Text>
            <Text style={styles.infoCardText}>
              Preview updates live as you fill in the form below.
            </Text>
          </View>
        </View>

        {/* ── Form Area ── */}
        <View style={styles.formSection}>

          {/* Image Upload */}
          <Text style={styles.fieldLabel}>Product Image</Text>
          <TouchableOpacity style={styles.uploadZone} onPress={handlePickImage} activeOpacity={0.8}>
            {imageUri && !imageFile ? (
              // Existing remote image — show thumbnail
              <Image source={{ uri: imageUri }} style={styles.uploadPreview} />
            ) : imageFile ? (
              <Image source={{ uri: imageUri }} style={styles.uploadPreview} />
            ) : (
              <>
                <Text style={styles.uploadIcon}>☁️</Text>
                <Text style={styles.uploadLabel}>Upload Image</Text>
                <Text style={styles.uploadHint}>JPEG or PNG, max 5 MB</Text>
              </>
            )}
            {(imageUri) && (
              <View style={styles.uploadChangeOverlay}>
                <Text style={styles.uploadChangeText}>Tap to change</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Product Name */}
          <Text style={styles.fieldLabel}>Product Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Midnight Espresso"
            placeholderTextColor="#A0856E"
            value={productName}
            onChangeText={setProductName}
            returnKeyType="next"
          />

          {/* Category */}
          <Text style={styles.fieldLabel}>Category</Text>
          <CategoryDropdown value={category} onChange={setCategory} />

          {/* Price */}
          <Text style={styles.fieldLabel}>Price</Text>
          <View style={styles.priceRow}>
            <View style={styles.pricePrefix}>
              <Text style={styles.pricePrefixText}>Rs.</Text>
            </View>
            <TextInput
              style={styles.priceInput}
              placeholder="0.00"
              placeholderTextColor="#A0856E"
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              returnKeyType="next"
            />
          </View>

          {/* Availability Toggle */}
          <View style={styles.toggleRow}>
            <Text style={styles.fieldLabel}>Availability</Text>
            <View style={styles.toggleRight}>
              <Text style={styles.toggleLabel}>{isAvailable ? 'Available' : 'Unavailable'}</Text>
              <Switch
                value={isAvailable}
                onValueChange={setIsAvailable}
                trackColor={{ false: '#D0B8A8', true: colors.primary }}
                thumbColor={isAvailable ? colors.accent : '#f4f3f4'}
                ios_backgroundColor="#D0B8A8"
              />
            </View>
          </View>

          {/* Description */}
          <Text style={styles.fieldLabel}>Description</Text>
          <TextInput
            style={styles.textarea}
            placeholder="Tell the story of this roast..."
            placeholderTextColor="#A0856E"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.btnDisabled]}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={saving || deleting}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>
                {isEditMode ? 'Update Product' : 'Save Product'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Delete Button (edit mode only) */}
          {isEditMode && (
            <TouchableOpacity
              style={[styles.deleteBtn, deleting && styles.btnDisabled]}
              onPress={handleDelete}
              activeOpacity={0.85}
              disabled={saving || deleting}
            >
              {deleting ? (
                <ActivityIndicator color="#c62828" size="small" />
              ) : (
                <Text style={styles.deleteBtnText}>🗑️  Delete Product</Text>
              )}
            </TouchableOpacity>
          )}

          <View style={{ height: spacing.xl }} />
        </View>
      </ScrollView>

      {/* ── Admin BottomNavBar ── */}
      <AdminBottomNavBar activeTab="Products" onTabPress={handleAdminTabPress} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.cream },

  // TopAppBar
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.cream,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(98,55,30,0.1)',
  },
  backBtn: { width: 40, alignItems: 'flex-start', justifyContent: 'center' },
  backIcon: { fontSize: 22, color: colors.dark },
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.bold,
    fontSize: fontSizes.base,
    color: colors.dark,
    letterSpacing: 0.5,
  },
  avatarCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarImage: { width: 36, height: 36, borderRadius: 18 },
  avatarInitial: { fontFamily: fonts.bold, fontSize: fontSizes.base, color: '#fff' },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },

  // Sidebar / Preview
  sidebarSection: { marginBottom: spacing.lg },
  sidebarHeading: {
    fontFamily: fonts.extraBold,
    fontSize: fontSizes['2xl'],
    color: colors.dark,
    marginBottom: 4,
  },
  sidebarSubtitle: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: '#8B6A55',
    marginBottom: spacing.md,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  infoCardIcon: { fontSize: 18 },
  infoCardText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.dark,
    lineHeight: 18,
  },

  // Form
  formSection: { marginBottom: spacing.md },
  fieldLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.dark,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },

  // Image Upload Zone
  uploadZone: {
    height: 140,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(98,55,30,0.3)',
    borderRadius: borderRadius.card,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  uploadIcon: { fontSize: 32, marginBottom: spacing.xs },
  uploadLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.md,
    color: colors.primary,
    marginBottom: 2,
  },
  uploadHint: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: '#A0856E',
  },
  uploadPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  uploadChangeOverlay: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(46,21,0,0.5)',
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  uploadChangeText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.xs,
    color: '#fff',
  },

  // Text Input
  input: {
    height: 52,
    backgroundColor: '#fff',
    borderRadius: borderRadius.input,
    borderWidth: 1,
    borderColor: 'rgba(98,55,30,0.2)',
    paddingHorizontal: spacing.md,
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
    color: colors.dark,
  },

  // Price Row
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: borderRadius.input,
    borderWidth: 1,
    borderColor: 'rgba(98,55,30,0.2)',
    overflow: 'hidden',
    height: 52,
  },
  pricePrefix: {
    width: 44,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRightWidth: 1,
    borderRightColor: 'rgba(98,55,30,0.15)',
  },
  pricePrefixText: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.base,
    color: colors.primary,
  },
  priceInput: {
    flex: 1,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
    color: colors.dark,
  },

  // Availability Toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  toggleRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  toggleLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.dark,
  },

  // Textarea
  textarea: {
    minHeight: 100,
    backgroundColor: '#fff',
    borderRadius: borderRadius.input,
    borderWidth: 1,
    borderColor: 'rgba(98,55,30,0.2)',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm + 4,
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
    color: colors.dark,
    lineHeight: 22,
  },

  // Buttons
  saveBtn: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    shadowColor: colors.dark,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  saveBtnText: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.base,
    color: '#fff',
    letterSpacing: 0.5,
  },
  deleteBtn: {
    height: 52,
    backgroundColor: '#fde8e8',
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: '#f5c6c6',
  },
  deleteBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.base,
    color: '#c62828',
  },
  btnDisabled: { opacity: 0.6 },
});
