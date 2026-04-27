import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { relationshipsApi, apiErrorMessage } from '../lib/api';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

const SCORE_COLOR = (score: number) => {
  if (score >= 70) return '#10b981';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
};

function ContactRow({ item, onPress }: { item: any; onPress: () => void }) {
  const score = item.relationship_score ?? 0;
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.avatar, { backgroundColor: avatarColor(item.contact_email) }]}>
        <Text style={styles.avatarText}>{(item.contact_name || item.contact_email || '?')[0].toUpperCase()}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{item.contact_name || item.contact_email}</Text>
        <Text style={styles.email} numberOfLines={1}>{item.contact_email}</Text>
        {item.last_interaction && (
          <Text style={styles.last}>Last: {new Date(item.last_interaction).toLocaleDateString()}</Text>
        )}
      </View>
      <View style={styles.scoreBox}>
        <Text style={[styles.score, { color: SCORE_COLOR(score) }]}>{score}</Text>
        <Text style={styles.scoreLabel}>score</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function RelationshipsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await relationshipsApi.getAll();
      setContacts(Array.isArray(data) ? data : data.contacts || []);
      setError('');
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to load relationships'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const filtered = contacts.filter(c =>
    !search ||
    (c.contact_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.contact_email || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <View style={styles.centered}><ActivityIndicator color="#60a5fa" size="large" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color="#64748b" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search contacts..."
          placeholderTextColor="#64748b"
          value={search}
          onChangeText={setSearch}
        />
        {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color="#64748b" /></TouchableOpacity> : null}
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={load}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.contact_email}
          renderItem={({ item }) => (
            <ContactRow
              item={item}
              onPress={() => navigation.navigate('ContactDetail', {
                contactEmail: item.contact_email,
                contactName: item.contact_name || item.contact_email,
              })}
            />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#60a5fa" />}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="people-outline" size={48} color="#334155" />
              <Text style={styles.emptyText}>No contacts yet</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function avatarColor(str: string) {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#3b82f6'];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b',
    marginHorizontal: 16, marginVertical: 10, borderRadius: 12, paddingHorizontal: 12,
    borderWidth: 1, borderColor: '#334155',
  },
  searchInput: { flex: 1, color: '#fff', paddingVertical: 10, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  info: { flex: 1 },
  name: { color: '#e2e8f0', fontSize: 15, fontWeight: '600', marginBottom: 2 },
  email: { color: '#64748b', fontSize: 12, marginBottom: 2 },
  last: { color: '#475569', fontSize: 11 },
  scoreBox: { alignItems: 'center', minWidth: 44 },
  score: { fontSize: 20, fontWeight: '800' },
  scoreLabel: { color: '#475569', fontSize: 10 },
  errorBox: { margin: 16, backgroundColor: '#1e293b', borderRadius: 12, padding: 16, alignItems: 'center' },
  errorText: { color: '#ef4444', marginBottom: 8 },
  retryText: { color: '#60a5fa', fontWeight: '600' },
  emptyText: { color: '#475569', marginTop: 12, fontSize: 15 },
});
