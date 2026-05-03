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
import spacing, { borderRadius } from '../theme/spacing';
import { fontSizes } from '../theme/typography';

const EMPTY_FORM = {
  rewardName: '',
  pointsRequired: '',
  description: '',
  isAvailable: true,
};

export default function AdminRewardsScreen() {
  const { user, token } = useAuth();

  const [rewards, setRewards]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);

  // Guard: non-admin
  if (!user || user.role !== 'admin') {
    return (
      <View style={styles.centered}>
        <Text style={styles.notAuth}>Not authorized</Text>
      </View>
    );
  }

  const authHeader = () => ({ headers: { Authorization: `Bearer ${token}` } });

  const fetchRewards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/api/rewards`, authHeader());
      setRewards(res.data);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to load rewards');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  const openAddForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEditForm = (reward) => {
    setEditingId(reward._id);
    setForm({
      rewardName: reward.rewardName,
      pointsRequired: String(reward.pointsRequired),
      description: reward.description || '',
      isAvailable: reward.isAvailable,
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    const { rewardName, pointsRequired } = form;

    if (!rewardName.trim()) {
      Alert.alert('Validation', 'Reward name is required.');
      return;
    }
    const pts = parseInt(pointsRequired, 10);
    if (!pointsRequired.trim() || isNaN(pts) || pts < 1) {
      Alert.alert('Validation', 'Points required must be a positive integer.');
      return;
    }

    const payload = {
      rewardName: rewardName.trim(),
      pointsRequired: pts,
      description: form.description.trim(),
      isAvailable: form.isAvailable,
    };

    setSaving(true);
    try {
      if (editingId) {
        await axios.put(`${BASE_URL}/api/rewards/${editingId}`, payload, authHeader());
      } else {
        await axios.post(`${BASE_URL}/api/rewards`, payload, authHeader());
      }
      cancelForm();
      fetchRewards();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to save reward');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (reward) => {
    Alert.alert(
      'Delete Reward',
      `Delete "${reward.rewardName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${BASE_URL}/api/rewards/${reward._id}`, authHeader());
              fetchRewards();
            } catch (err) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to delete reward');
            }
          },
        },
      ]
    );
  };

  const handleImagePick = async (rewardId) => {
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
      name: asset.fileName || 'reward.jpg',
      type: asset.mimeType || 'image/jpeg',
    });

    try {
      await axios.post(`${BASE_URL}/api/rewards/${rewardId}/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      Alert.alert('Success', 'Image uploaded.');
      fetchRewards();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Image upload failed');
    }
  };

  const renderReward = ({ item }) => (
    <View style={styles.rewardCard}>
      {item.rewardImageUrl ? (
        <Image source={{ uri: item.rewardImageUrl }} style={styles.rewardImage} />
      ) : (
        <View style={[styles.rewardImage, styles.imagePlaceholder]}>
          <Text style={styles.imagePlaceholderText}>🎁</Text>
        </View>
      )}
      <View style={styles.rewardInfo}>
        <Text style={styles.rewardName}>{item.rewardName}</Text>
        <Text style={styles.rewardMeta}>{item.pointsRequired} pts</Text>
        <Text style={[styles.badge, item.isAvailable ? styles.badgeAvail : styles.badgeUnavail]}>
          {item.isAvailable ? 'Available' : 'Unavailable'}
        </Text>
      </View>
      <View style={styles.rewardActions}>
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
        <Text style={styles.title}>Rewards</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAddForm}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Inline form */}
      {showForm && (
        <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
          <Text style={styles.formTitle}>{editingId ? 'Edit Reward' : 'New Reward'}</Text>

          <Text style={styles.label}>Reward Name *</Text>
          <TextInput
            style={styles.input}
            value={form.rewardName}
            onChangeText={(v) => setForm((f) => ({ ...f, rewardName: v }))}
            placeholder="e.g. Free Coffee"
            placeholderTextColor="#aaa"
          />

          <Text style={styles.label}>Points Required *</Text>
          <TextInput
            style={styles.input}
            value={form.pointsRequired}
            onChangeText={(v) => setForm((f) => ({ ...f, pointsRequired: v }))}
            placeholder="e.g. 100"
            placeholderTextColor="#aaa"
            keyboardType="number-pad"
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

      {/* Reward list */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} size="large" />
      ) : (
        <FlatList
          data={rewards}
          keyExtractor={(item) => item._id}
          renderItem={renderReward}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No rewards found.</Text>}
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
    fontSize: fontSizes.base,
    color: colors.dark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.primary,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: '#fff',
  },
  addBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.input,
  },
  addBtnText: {
    color: colors.dark,
    fontWeight: '600',
  },

  // ── Form ──
  form: {
    backgroundColor: '#fff',
    margin: spacing.md,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    maxHeight: 420,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  formTitle: {
    fontSize: fontSizes.base,
    fontWeight: '700',
    color: colors.dark,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSizes.sm,
    color: colors.dark,
    marginBottom: 4,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: borderRadius.input,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSizes.md,
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
    marginTop: spacing.md,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: borderRadius.input,
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
    borderRadius: borderRadius.input,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: colors.primary,
    fontWeight: '600',
  },

  // ── List ──
  list: {
    padding: spacing.md,
    paddingBottom: 40,
  },
  empty: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
  },
  rewardCard: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.card,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  rewardImage: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.input,
    marginRight: 10,
  },
  imagePlaceholder: {
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: 24,
  },
  rewardInfo: {
    flex: 1,
  },
  rewardName: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.dark,
  },
  rewardMeta: {
    fontSize: fontSizes.sm,
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
  rewardActions: {
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
    fontSize: fontSizes.sm,
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
