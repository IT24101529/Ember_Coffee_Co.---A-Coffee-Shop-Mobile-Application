import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL } from '../../config/api';
import StarRating from './StarRating';
import colors from '../../theme/colors';
import spacing, { borderRadius } from '../../theme/spacing';
import { fonts, fontSizes } from '../../theme/typography';

/**
 * ReviewOverlay — bottom sheet for submitting a product review.
 *
 * Props:
 *   visible   boolean
 *   product   { _id, productName, productImageUrl }
 *   onClose   () => void
 *   onSuccess () => void  — called after successful submission
 */
export default function ReviewOverlay({ visible, product, initialReview, onClose, onSuccess }) {
  const { token } = useAuth();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [photoUris, setPhotoUris] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (visible) {
      if (initialReview) {
        setRating(initialReview.rating || 0);
        setComment(initialReview.comment || '');
        setPhotoUris([]);
      } else {
        setRating(0);
        setComment('');
        setPhotoUris([]);
      }
    }
  }, [visible, initialReview]);

  const reset = () => {
    setRating(0);
    setComment('');
    setPhotoUris([]);
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handlePickPhoto = async () => {
    if (photoUris.length >= 3) {
      Alert.alert('Limit reached', 'You can attach up to 3 photos.');
      return;
    }
    let ImagePicker;
    try {
      ImagePicker = require('expo-image-picker');
    } catch {
      Alert.alert('Missing dependency', 'Install expo-image-picker to attach photos.');
      return;
    }
    Alert.alert(
      'Add a Photo',
      'Choose the photo source',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Camera',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission required', 'Allow access to your camera.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              quality: 0.8,
            });
            if (!result.canceled) {
              setPhotoUris((prev) => [...prev, result.assets[0].uri]);
            }
          }
        },
        {
          text: 'Gallery',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission required', 'Allow access to your photo library.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              quality: 0.8,
            });
            if (!result.canceled) {
              setPhotoUris((prev) => [...prev, result.assets[0].uri]);
            }
          }
        }
      ]
    );
  };

  const removePhoto = (index) => {
    setPhotoUris((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadPhoto = async (reviewId, uri) => {
    const formData = new FormData();
    formData.append('image', { uri, name: 'review.jpg', type: 'image/jpeg' });
    await axios.post(
      `${BASE_URL}/api/reviews/${reviewId}/upload`,
      formData,
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } },
    );
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating required', 'Please select a star rating.');
      return;
    }
    if (comment.trim().length === 0) {
      Alert.alert('Comment required', 'Please write a brief comment for your review.');
      return;
    }
    setSubmitting(true);
    try {
      let dataId;

      if (initialReview) {
        const { data } = await axios.put(
          `${BASE_URL}/api/reviews/${initialReview._id}`,
          { rating, comment: comment.trim() },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        dataId = data._id;
      } else {
        const { data } = await axios.post(
          `${BASE_URL}/api/reviews`,
          { productId: product._id, rating, comment: comment.trim() },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        dataId = data._id;
      }

      // Upload photos sequentially
      for (const uri of photoUris) {
        try {
          await uploadPhoto(dataId, uri);
        } catch {
          // non-fatal — review already saved
        }
      }

      reset();
      onSuccess();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!product) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouchable} onPress={handleClose} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrapper}
        >
          <View style={styles.sheet}>
            {/* Handle bar */}
            <View style={styles.handle} />

            {/* Header */}
            <View style={styles.header}>
              {product.productImageUrl ? (
                <Image
                  source={{ uri: product.productImageUrl }}
                  style={styles.productThumb}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.productThumb, styles.thumbPlaceholder]}>
                  <Text style={{ fontSize: 20 }}>☕</Text>
                </View>
              )}
              <Text style={styles.productName} numberOfLines={2}>
                {product.productName}
              </Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Flavor Score */}
              <Text style={styles.sectionLabel}>Flavor Score</Text>
              <View style={styles.starsRow}>
                <StarRating rating={rating} onRate={setRating} size={36} />
              </View>

              {/* Your Thoughts */}
              <Text style={styles.sectionLabel}>Your Thoughts</Text>
              <TextInput
                style={styles.textarea}
                placeholder="What did you think of this brew?"
                placeholderTextColor={`${colors.dark}55`}
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={4}
                maxLength={500}
                textAlignVertical="top"
              />

              {/* Add a Photo */}
              <Text style={styles.sectionLabel}>Add a Photo</Text>
              <View style={styles.photoRow}>
                {/* Upload button */}
                {photoUris.length < 3 && (
                  <TouchableOpacity style={styles.photoUploadBtn} onPress={handlePickPhoto} activeOpacity={0.75}>
                    <Text style={styles.photoUploadIcon}>📷</Text>
                    <Text style={styles.photoUploadText}>Upload</Text>
                  </TouchableOpacity>
                )}

                {/* Preview slots */}
                {photoUris.map((uri, index) => (
                  <View key={index} style={styles.photoSlot}>
                    <Image source={{ uri }} style={styles.photoPreview} resizeMode="cover" />
                    <TouchableOpacity
                      style={styles.photoRemoveBtn}
                      onPress={() => removePhoto(index)}
                    >
                      <Text style={styles.photoRemoveIcon}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Empty slots */}
                {Array.from({ length: Math.max(0, 3 - photoUris.length - (photoUris.length < 3 ? 1 : 0)) }).map((_, i) => (
                  <View key={`empty-${i}`} style={[styles.photoSlot, styles.photoSlotEmpty]} />
                ))}
              </View>

              {/* Submit */}
              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>{initialReview ? 'Update Review' : 'Submit Review'}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const THUMB_SIZE = 52;
const PHOTO_SLOT_SIZE = 80;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    flex: 1,
  },
  sheetWrapper: {
    // sits at bottom
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.sm,
    maxHeight: '90%',
  },

  // Handle
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.accent,
  },
  productThumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: borderRadius.input,
    marginRight: spacing.md,
  },
  thumbPlaceholder: {
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productName: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: fontSizes.base,
    color: colors.dark,
    marginRight: spacing.sm,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 14,
    color: colors.dark,
    fontFamily: fonts.bold,
  },

  // Body
  body: {
    flexGrow: 0,
  },
  bodyContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sectionLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.md,
    color: colors.dark,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },

  // Stars
  starsRow: {
    marginBottom: spacing.sm,
  },

  // Textarea
  textarea: {
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: borderRadius.input,
    padding: spacing.md,
    fontFamily: fonts.regular,
    fontSize: fontSizes.base,
    color: colors.dark,
    minHeight: 96,
    textAlignVertical: 'top',
  },

  // Photos
  photoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
  photoUploadBtn: {
    width: PHOTO_SLOT_SIZE,
    height: PHOTO_SLOT_SIZE,
    borderRadius: borderRadius.input,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoUploadIcon: {
    fontSize: 22,
  },
  photoUploadText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.xs,
    color: colors.primary,
  },
  photoSlot: {
    width: PHOTO_SLOT_SIZE,
    height: PHOTO_SLOT_SIZE,
    borderRadius: borderRadius.input,
    overflow: 'hidden',
    position: 'relative',
  },
  photoSlotEmpty: {
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderStyle: 'dashed',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  photoRemoveBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveIcon: {
    fontSize: 10,
    color: '#fff',
    fontFamily: fonts.bold,
  },

  // Submit
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.pill,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  submitBtnDisabled: {
    opacity: 0.55,
  },
  submitText: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.base,
    color: '#fff',
    letterSpacing: 0.3,
  },
});
