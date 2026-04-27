import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { knowledgeApi, apiErrorMessage } from '../lib/api';

const CATEGORY_COLORS: Record<string, string> = {
  product: '#6366f1',
  pricing: '#10b981',
  process: '#f59e0b',
  contact: '#60a5fa',
  preference: '#a78bfa',
};

function KnowledgeItem({ item, onDelete }: { item: any; onDelete: () => void }) {
  return (
    <View style={styles.item}>
      <View style={styles.itemHeader}>
        {item.category && (
          <View style={[styles.catBadge, { backgroundColor: (CATEGORY_COLORS[item.category] || '#64748b') + '20' }]}>
            <Text style={[styles.catText, { color: CATEGORY_COLORS[item.category] || '#94a3b8' }]}>{item.category}</Text>
          </View>
        )}
        <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={16} color="#64748b" />
        </TouchableOpacity>
      </View>
      <Text style={styles.content}>{item.content}</Text>
      {item.source_email_subject && (
        <Text style={styles.source} numberOfLines={1}>From: {item.source_email_subject}</Text>
      )}
    </View>
  );
}

export default function KnowledgeScreen() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async (q?: string) => {
    try {
      const data = await knowledgeApi.getAll(q ? { search: q } : undefined);
      setEntries(Array.isArray(data) ? data : data.entries || []);
      setError('');
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to load knowledge'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const handleDelete = (id: string) => {
    Alert.alert('Delete', 'Delete this knowledge entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await knowledgeApi.deleteEntry(id);
            setEntries(prev => prev.filter(e => e.id !== id));
          } catch (err) {
            Toast.show({ type: 'error', text1: apiErrorMessage(err, 'Delete failed') });
          }
        },
      },
    ]);
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator color="#60a5fa" size="large" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color="#64748b" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search knowledge..."
          placeholderTextColor="#64748b"
          value={search}
          onChangeText={setSearch}
        />
        {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color="#64748b" /></TouchableOpacity> : null}
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => load()}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={i => i.id}
          renderItem={({ item }) => <KnowledgeItem item={item} onDelete={() => handleDelete(item.id)} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(search); }} tintColor="#60a5fa" />}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="library-outline" size={48} color="#334155" />
              <Text style={styles.emptyText}>No knowledge entries</Text>
            </View>
          }
        />
      )}
    </View>
  );
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
  item: { padding: 14, marginHorizontal: 16, marginVertical: 6, backgroundColor: '#1e293b', borderRadius: 14, borderWidth: 1, borderColor: '#334155' },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  catBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  catText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  deleteBtn: { padding: 4 },
  content: { color: '#e2e8f0', fontSize: 14, lineHeight: 20, marginBottom: 8 },
  source: { color: '#475569', fontSize: 12 },
  errorBox: { margin: 16, backgroundColor: '#1e293b', borderRadius: 12, padding: 16, alignItems: 'center' },
  errorText: { color: '#ef4444', marginBottom: 8 },
  retryText: { color: '#60a5fa', fontWeight: '600' },
  emptyText: { color: '#475569', marginTop: 12, fontSize: 15 },
});
