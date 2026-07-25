import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';

import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { showAlert } from '../services/alertService';
import { setUser, patchUserProfile } from '../redux/slices/authSlice';

const GENDER_OPTIONS = [
  { label: 'Male', value: 'MALE' },
  { label: 'Female', value: 'FEMALE' },
  { label: 'Other', value: 'OTHER' },
  { label: 'Prefer not to say', value: 'PREFER_NOT_TO_SAY' },
];

function SelectModal({ visible, title, items, onSelect, onClose, getKey, getLabel }) {
  const { theme: appTheme } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
        <View style={{
          backgroundColor: appTheme.surface || appTheme.bg2 || '#1c1c1e',
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          maxHeight: '75%',
          paddingBottom: 24
        }}>
          <View style={{
            flexDirection: 'row',
            justify: 'space-between',
            alignItems: 'center',
            padding: 18,
            borderBottomWidth: 1,
            borderBottomColor: appTheme.border || '#333'
          }}>
            <Text style={{ fontSize: 17, fontWeight: '600', color: appTheme.text || '#fff' }}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close-circle" size={24} color={appTheme.textMuted || '#888'} />
            </Pressable>
          </View>

          {items.length === 0 ? (
            <View style={{ padding: 30, alignItems: 'center' }}>
              <Text style={{ color: appTheme.textMuted || '#888', fontSize: 14 }}>No options available</Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item, index) => getKey ? getKey(item) : String(index)}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => { onSelect(item); onClose(); }}
                  style={({ pressed }) => [{
                    paddingVertical: 15,
                    paddingHorizontal: 22,
                    borderBottomWidth: 0.5,
                    borderBottomColor: appTheme.border || '#333',
                    backgroundColor: pressed ? (appTheme.border || '#333') : 'transparent'
                  }]}
                >
                  <Text style={{ fontSize: 15, fontWeight: '500', color: appTheme.text || '#fff' }}>
                    {getLabel ? getLabel(item) : String(item)}
                  </Text>
                </Pressable>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

export default function MyDetailsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme: appTheme, isDarkMode } = useTheme();
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');

  // Location Fields
  const [country, setCountry] = useState('IN');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');

  // Dropdown options
  const [countriesList, setCountriesList] = useState([]);
  const [statesList, setStatesList] = useState([]);
  const [citiesList, setCitiesList] = useState([]);

  // Modals
  const [genderModalOpen, setGenderModalOpen] = useState(false);
  const [countryModalOpen, setCountryModalOpen] = useState(false);
  const [stateModalOpen, setStateModalOpen] = useState(false);
  const [cityModalOpen, setCityModalOpen] = useState(false);

  // Load User Profile and Countries on Mount
  useEffect(() => {
    let cancelled = false;

    async function initData() {
      try {
        setLoading(true);
        const [userRes, countryRes] = await Promise.all([
          api.get('/auth/me'),
          api.get('/geo/countries').catch(() => ({ data: { data: [] } })),
        ]);

        if (cancelled) return;

        const u = userRes.data?.data || {};
        setName(u.name || '');
        setEmail(u.email || '');
        setStudentId(u.student_id || '');
        setMobileNo(u.mobile_no || '');
        setDob(u.dob ? u.dob.split('T')[0] : '');
        setGender(u.gender || '');
        setCountry(u.country || 'IN');
        setState(u.state || '');
        setCity(u.city || '');

        setCountriesList(countryRes.data?.data || []);
      } catch (err) {
        if (!cancelled) {
          showAlert('Error', 'Failed to load user profile');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    initData();
    return () => { cancelled = true; };
  }, []);

  // Fetch States when Country changes
  useEffect(() => {
    if (!country) {
      setStatesList([]);
      return;
    }
    let cancelled = false;
    api.get(`/geo/states?country=${country}`)
      .then((res) => {
        if (!cancelled) setStatesList(res.data?.data || []);
      })
      .catch(() => {
        if (!cancelled) setStatesList([]);
      });
    return () => { cancelled = true; };
  }, [country]);

  // Fetch Cities when State changes
  useEffect(() => {
    if (!country || !state) {
      setCitiesList([]);
      return;
    }
    let cancelled = false;
    api.get(`/geo/cities?country=${country}&state=${state}`)
      .then((res) => {
        if (!cancelled) setCitiesList(res.data?.data || []);
      })
      .catch(() => {
        if (!cancelled) setCitiesList([]);
      });
    return () => { cancelled = true; };
  }, [country, state]);

  const handleSave = async () => {
    if (!name.trim()) {
      showAlert('Required Field', 'Name cannot be empty.');
      return;
    }

    let formattedDob = dob.trim();
    if (!formattedDob || formattedDob.toLowerCase() === 'yyyy-mm-dd') {
      formattedDob = null;
    } else {
      const parsed = new Date(formattedDob);
      if (isNaN(parsed.getTime())) {
        showAlert('Invalid Date', 'Please enter a valid Date of Birth (YYYY-MM-DD) or leave it empty.');
        return;
      }
      formattedDob = parsed.toISOString();
    }

    try {
      setSaving(true);
      const payload = {
        name: name.trim(),
        mobile_no: mobileNo.trim() || null,
        dob: formattedDob,
        gender: gender || null,
        country: country || null,
        state: state || null,
        city: city || null,
      };

      const res = await api.patch('/auth/me', payload);

      const updatedUser = res.data?.data;
      if (updatedUser) {
        dispatch(setUser(updatedUser));
        dispatch(patchUserProfile(updatedUser));
      }

      showAlert('Success', 'Your personal details have been updated.');
      navigation.goBack();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to update personal details.';
      showAlert('Update Failed', msg);
    } finally {
      setSaving(false);
    }
  };

  const selectedCountryObj = countriesList.find((c) => c.code === country);
  const selectedStateObj = statesList.find((s) => s.code === state);
  const selectedGenderObj = GENDER_OPTIONS.find((g) => g.value === gender);

  const containerBg = appTheme.deepBlack || (isDarkMode ? '#000' : '#f5f5f5');
  const cardBg = appTheme.surface || (isDarkMode ? '#1c1c1e' : '#ffffff');
  const textColor = appTheme.text || (isDarkMode ? '#ffffff' : '#111111');
  const mutedTextColor = appTheme.textMuted || (isDarkMode ? '#8e8e93' : '#666666');
  const borderColor = appTheme.border || (isDarkMode ? '#2c2c2e' : '#e5e5ea');
  const primaryColor = appTheme.primary || '#FF3B30';

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: containerBg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: containerBg }]}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 30 }]}
    >
      {/* Account Identity Section */}
      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <Text style={[styles.cardHeader, { color: primaryColor }]}>Account Identity</Text>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: mutedTextColor }]}>Full Name</Text>
          <TextInput
            style={[styles.input, { color: textColor, borderColor, backgroundColor: isDarkMode ? 'transparent' : '#fcfcfc' }]}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor={mutedTextColor}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: mutedTextColor }]}>Email Address (Read-Only)</Text>
          <TextInput
            style={[
              styles.input,
              {
                color: mutedTextColor,
                borderColor,
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
              },
            ]}
            value={email}
            editable={false}
          />
        </View>

        {studentId ? (
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: mutedTextColor }]}>Student ID</Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: mutedTextColor,
                  borderColor,
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                },
              ]}
              value={studentId}
              editable={false}
            />
          </View>
        ) : null}
      </View>

      {/* Personal & Demographic Details */}
      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <Text style={[styles.cardHeader, { color: primaryColor }]}>Personal Details</Text>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: mutedTextColor }]}>Mobile Number</Text>
          <TextInput
            style={[styles.input, { color: textColor, borderColor, backgroundColor: isDarkMode ? 'transparent' : '#fcfcfc' }]}
            value={mobileNo}
            onChangeText={setMobileNo}
            placeholder="+91 9876543210"
            placeholderTextColor={mutedTextColor}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: mutedTextColor }]}>Date of Birth (YYYY-MM-DD)</Text>
          <TextInput
            style={[styles.input, { color: textColor, borderColor, backgroundColor: isDarkMode ? 'transparent' : '#fcfcfc' }]}
            value={dob}
            onChangeText={setDob}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={mutedTextColor}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: mutedTextColor }]}>Gender</Text>
          <Pressable
            onPress={() => setGenderModalOpen(true)}
            style={[styles.selectInput, { borderColor, backgroundColor: isDarkMode ? 'transparent' : '#fcfcfc' }]}
          >
            <Text style={{ color: selectedGenderObj ? textColor : mutedTextColor, fontSize: 15 }}>
              {selectedGenderObj ? selectedGenderObj.label : 'Select Gender'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={mutedTextColor} />
          </Pressable>
        </View>
      </View>

      {/* Location Details */}
      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <Text style={[styles.cardHeader, { color: primaryColor }]}>Location & Region</Text>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: mutedTextColor }]}>Country</Text>
          <Pressable
            onPress={() => setCountryModalOpen(true)}
            style={[styles.selectInput, { borderColor, backgroundColor: isDarkMode ? 'transparent' : '#fcfcfc' }]}
          >
            <Text style={{ color: selectedCountryObj ? textColor : mutedTextColor, fontSize: 15 }}>
              {selectedCountryObj ? `${selectedCountryObj.flag} ${selectedCountryObj.name}` : 'Select Country'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={mutedTextColor} />
          </Pressable>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: mutedTextColor }]}>State / Province</Text>
          <Pressable
            onPress={() => setStateModalOpen(true)}
            style={[styles.selectInput, { borderColor, backgroundColor: isDarkMode ? 'transparent' : '#fcfcfc' }]}
          >
            <Text style={{ color: selectedStateObj ? textColor : state ? textColor : mutedTextColor, fontSize: 15 }}>
              {selectedStateObj ? selectedStateObj.name : state || 'Select State'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={mutedTextColor} />
          </Pressable>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: mutedTextColor }]}>City</Text>
          <Pressable
            onPress={() => setCityModalOpen(true)}
            style={[styles.selectInput, { borderColor, backgroundColor: isDarkMode ? 'transparent' : '#fcfcfc' }]}
          >
            <Text style={{ color: city ? textColor : mutedTextColor, fontSize: 15 }}>
              {city || 'Select City'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={mutedTextColor} />
          </Pressable>
        </View>
      </View>

      {/* Save Details Button */}
      <Pressable
        onPress={handleSave}
        disabled={saving}
        style={({ pressed }) => [
          styles.saveButton,
          { backgroundColor: primaryColor },
          pressed && { opacity: 0.8 },
          saving && { opacity: 0.6 },
        ]}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save Details</Text>
        )}
      </Pressable>

      {/* Modals */}
      <SelectModal
        visible={genderModalOpen}
        title="Select Gender"
        items={GENDER_OPTIONS}
        getKey={(item) => item.value}
        getLabel={(item) => item.label}
        onSelect={(item) => setGender(item.value)}
        onClose={() => setGenderModalOpen(false)}
      />

      <SelectModal
        visible={countryModalOpen}
        title="Select Country"
        items={countriesList}
        getKey={(item) => item.code}
        getLabel={(item) => `${item.flag} ${item.name}`}
        onSelect={(item) => {
          setCountry(item.code);
          setState('');
          setCity('');
        }}
        onClose={() => setCountryModalOpen(false)}
      />

      <SelectModal
        visible={stateModalOpen}
        title="Select State"
        items={statesList}
        getKey={(item) => item.code}
        getLabel={(item) => item.name}
        onSelect={(item) => {
          setState(item.code);
          setCity('');
        }}
        onClose={() => setStateModalOpen(false)}
      />

      <SelectModal
        visible={cityModalOpen}
        title="Select City"
        items={citiesList}
        getKey={(item) => item.name}
        getLabel={(item) => item.name}
        onSelect={(item) => setCity(item.name)}
        onClose={() => setCityModalOpen(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    padding: 16,
    gap: 16,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  selectInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justify: 'space-between',
  },
  saveButton: {
    height: 52,
    borderRadius: 12,
    justify: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
