import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Switch,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { BASE_URL } from '../config/api';
import colors from '../theme/colors';

const EMPTY_FORM = {
  productName: '',
  category: '',
  price: '',
  description: '',
  isAvailable: true,
};

export default function AdminProductsScreen() {
  const { user, token } = useAuth();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // null = add mode, string id = edit mode
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  // Guard: non-admin
  if (!user || user.role !== 'admin') {
    return (
      <View style={styles.centered}>
        <Text style={styles.notAuth}>Not authorized</Text>
      </View>
    );
  }

  const authHeader = () => ({
    headers: { Authorization: `Bearer ${token}` },
  });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      // Admin needs all products including unavailable — use a direct DB call
      // The public endpoint only returns available ones, so we hit the same
      // endpoint but the admin token allows us to see all via the backend.
      // (If the backend exposes an admin-all route, swap the URL here.)
      const res = await axios.get(`${BASE_URL}/api/products/all`, authHeader());
      setProducts(res.data);
    } catch {
      // Fallback: public endpoint (only available products)
      try {
        const res = await axios.get(`${BASE_URL}/api/products`, authHeader());
        setProducts(res.data);
      } catch (err) {
        Alert.alert('Error', err?.response?.data?.message || 'Failed to load products');
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const openAddForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEditForm = (product) => {
    setEditingId(product._id);
    setForm({
      productName: product.productName,
      category: product.category,
      price: String(product.price),
      description: product.description || '',
      isAvailable: product.isAvailable,
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    const { productName, category, price } = form;
    if (!productName.trim() || !category.trim() || !price.trim()) {
      Alert.alert('Validation', 'Product name, category, and price are required.');
      return;
    }
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      Alert.alert('Validation', 'Price must be a non-negative number.');
      return;
    }

    const payload = {
      productName: productName.trim(),
      category: category.trim(),
      price: parsedPrice,
      description: form.description.trim(),
      isAvailable: form.isAvailable,
    };

    setSaving(true);
    try {
      if (editingId) {
        await axios.put(`${BASE_URL}/api/products/${editingId}`, payload, authHeader());
      } else {
        await axios.post(`${BASE_URL}/api/products`, payload, authHeader());
      }
      cancelForm();
      fetchProducts();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (product) => {
    Alert.alert(
      'Delete Product',
      `Delete "${product.productName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${BASE_URL}/api/products/${product._id}`, authHeader());
              fetchProducts();
            } catch (err) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to delete product');
            }
          },
        },
      ]
    );
  };

  const handleImagePick = async (productId) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Media library access is needed to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    const formData = new FormData();
    formData.append('image', {
      uri: asset.uri,
      name: asset.fileName || 'product.jpg',
      type: asset.mimeType || 'image/jpeg',
    });

    try {
      await axios.post(`${BASE_URL}/api/products/${productId}/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      Alert.alert('Success', 'Image uploaded.');
      fetchProducts();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Image upload failed');
    }
  };

  const renderProduct = ({ item }) => (
    <View style={styles.productCard}>
      {item.productImageUrl ? (
        <Image source={{ uri: item.productImageUrl }} style={styles.productImage} />
      ) : (
        <View style={[styles.productImage, styles.imagePlaceholder]}>
          <Text style={styles.imagePlaceholderText}>No Image</Text>
        </View>
      )}
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.productName}</Text>
        <Text style={styles.productMeta}>{item.category} · ${parseFloat(item.price).toFixed(2)}</Text>
        <Text style={[styles.badge, item.isAvailable ? styles.badgeAvail : styles.badgeUnavail]}>
          {item.isAvailable ? 'Available' : 'Unavailable'}
        </Text>
      </View>
      <View style={styles.productActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => openEditForm(item)}>
          <Text style={styles.actionBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleImagePick(item._id)}>
          <Text style={styles.actionBtnText}>Image</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(item)}>
          <Text style={[styles.actionBtnText, styles.deleteBtnText]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Products</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAddForm}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Inline form */}
      {showForm && (
        <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
          <Text style={styles.formTitle}>{editingId ? 'Edit Product' : 'New Product'}</Text>

          <Text style={styles.label}>Product Name *</Text>
          <TextInput
            style={styles.input}
            value={form.productName}
            onChangeText={(v) => setForm((f) => ({ ...f, productName: v }))}
            placeholder="e.g. Flat White"
            placeholderTextColor="#aaa"
          />

          <Text style={styles.label}>Category *</Text>
          <TextInput
            style={styles.input}
            value={form.category}
            onChangeText={(v) => setForm((f) => ({ ...f, category: v }))}
            placeholder="e.g. Coffee"
            placeholderTextColor="#aaa"
          />

          <Text style={styles.label}>Price *</Text>
          <TextInput
            style={styles.input}
            value={form.price}
            onChangeText={(v) => setForm((f) => ({ ...f, price: v }))}
            placeholder="e.g. 4.50"
            placeholderTextColor="#aaa"
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={form.description}
            onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
            placeholder="Optional description"
            placeholderTextColor="#aaa"
            multiline
            numberOfLines={3}
          />

          <View style={styles.toggleRow}>
            <Text style={styles.label}>Available</Text>
            <Switch
              value={form.isAvailable}
              onValueChange={(v) => setForm((f) => ({ ...f, isAvailable: v }))}
              trackColor={{ false: '#ccc', true: colors.primary }}
              thumbColor={form.isAvailable ? colors.accent : '#f4f3f4'}
            />
          </View>

          <View style={styles.formButtons}>
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>{editingId ? 'Update' : 'Create'}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={cancelForm}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Product list */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} size="large" />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item._id}
          renderItem={renderProduct}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No products found.</Text>}
        />
      )}
    </KeyboardAvoidingView>
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
  notAuth: {
    fontSize: 16,
    color: colors.dark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: colors.primary,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  addBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: {
    color: colors.dark,
    fontWeight: '600',
  },
  // Form
  form: {
    backgroundColor: '#fff',
    margin: 12,
    borderRadius: 12,
    padding: 16,
    maxHeight: 420,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.dark,
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    color: colors.dark,
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.dark,
    backgroundColor: colors.cream,
  },
  textArea: {
    height: 72,
    textAlignVertical: 'top',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    marginBottom: 8,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: colors.primary,
    fontWeight: '600',
  },
  // List
  list: {
    padding: 12,
    paddingBottom: 40,
  },
  empty: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 10,
  },
  imagePlaceholder: {
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: 10,
    color: colors.dark,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
  },
  productMeta: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  badge: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  badgeAvail: {
    color: '#2e7d32',
  },
  badgeUnavail: {
    color: '#c62828',
  },
  productActions: {
    flexDirection: 'column',
    gap: 4,
    alignItems: 'flex-end',
  },
  actionBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 12,
    color: colors.dark,
    fontWeight: '600',
  },
  deleteBtn: {
    backgroundColor: '#fde8e8',
  },
  deleteBtnText: {
    color: '#c62828',
  },
});
