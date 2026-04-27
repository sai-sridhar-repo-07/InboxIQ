import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function SettingsScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user?.email || '');
    });
  }, []);

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive', onPress: async () => {
          setLoading(true);
          await supabase.auth.signOut();
          setLoading(false);
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={22} color="#60a5fa" />
          </View>
          <View style={styles.info}>
            <Text style={styles.label}>Signed in as</Text>
            <Text style={styles.email} numberOfLines={1}>{email}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.signoutBtn} onPress={handleSignOut} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#ef4444" size="small" />
          : <>
              <Ionicons name="log-out-outline" size={18} color="#ef4444" />
              <Text style={styles.signoutText}>Sign Out</Text>
            </>
        }
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155', marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1e3a8a', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  info: { flex: 1 },
  label: { color: '#64748b', fontSize: 12, marginBottom: 2 },
  email: { color: '#e2e8f0', fontSize: 14, fontWeight: '600' },
  signoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#1e293b', borderRadius: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: '#450a0a',
  },
  signoutText: { color: '#ef4444', fontWeight: '700', fontSize: 15 },
});
