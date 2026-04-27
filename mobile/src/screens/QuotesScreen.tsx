import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { quotesApi, apiErrorMessage } from '../lib/api';

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  draft:    { bg: '#1e293b', text: '#94a3b8' },
  sent:     { bg: '#1e3a8a', text: '#93c5fd' },
  accepted: { bg: '#14532d', text: '#86efac' },
  rejected: { bg: '#450a0a', text: '#fca5a5' },
};

const NEXT_STATUSES: Record<string, string[]> = {
  draft: ['sent'],
  sent: ['accepted', 'rejected'],
  accepted: [],
  rejected: [],
};

function QuoteItem({ item, onStatusChange }: { item: any; onStatusChange: (status: string) => void }) {
  const style = STATUS_STYLE[item.status] || STATUS_STYLE.draft;
  const nexts = NEXT_STATUSES[item.status] || [];
  return (
    <View style={styles.item}>
      <View style={styles.itemHeader}>
        <Text style={styles.title} numberOfLines={1}>{item.subject || 'Quote'}</Text>
        <View style={[styles.badge, { backgroundColor: style.bg }]}>
          <Text style={[styles.badgeText, { color: style.text }]}>{item.status}</Text>
        </View>
      </View>
      {item.amount && (
        <Text style={styles.amount}>₹{Number(item.amount).toLocaleString()}</Text>
      )}
      {item.client_name && <Text style={styles.client}>{item.client_name}</Text>}
      {item.created_at && <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>}
      {nexts.length > 0 && (
        <View style={styles.actions}>
          {nexts.map(s => (
            <TouchableOpacity key={s} style={[styles.actionBtn, s === 'accepted' && styles.acceptBtn, s === 'rejected' && styles.rejectBtn]} onPress={() => onStatusChange(s)}>
              <Text style={styles.actionText}>{s.charAt(0).toUpperCase() + s.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

export default function QuotesScreen() {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await quotesApi.getAll();
      setQuotes(Array.isArray(data) ? data : data.quotes || []);
      setError('');
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to load quotes'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const handleStatusChange = async (id: string, status: string) => {
    setQuotes(prev => prev.map(q => q.id === id ? { ...q, status } : q));
    try {
      await quotesApi.updateStatus(id, status);
    } catch (err) {
      await load();
      Toast.show({ type: 'error', text1: apiErrorMessage(err, 'Update failed') });
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator color="#60a5fa" size="large" /></View>;

  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={load}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={quotes}
          keyExtractor={i => i.id}
          renderItem={({ item }) => (
            <QuoteItem item={item} onStatusChange={status => handleStatusChange(item.id, status)} />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#60a5fa" />}
          contentContainerStyle={{ paddingVertical: 8 }}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="document-text-outline" size={48} color="#334155" />
              <Text style={styles.emptyText}>No quotes yet</Text>
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
  item: { marginHorizontal: 16, marginVertical: 6, backgroundColor: '#1e293b', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#334155' },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { flex: 1, color: '#e2e8f0', fontSize: 15, fontWeight: '600', marginRight: 10 },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  amount: { color: '#10b981', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  client: { color: '#94a3b8', fontSize: 13, marginBottom: 2 },
  date: { color: '#475569', fontSize: 11, marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: '#0f172a', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  acceptBtn: { backgroundColor: '#14532d', borderColor: '#166534' },
  rejectBtn: { backgroundColor: '#450a0a', borderColor: '#7f1d1d' },
  actionText: { color: '#e2e8f0', fontSize: 13, fontWeight: '600' },
  errorBox: { margin: 16, backgroundColor: '#1e293b', borderRadius: 12, padding: 16, alignItems: 'center' },
  errorText: { color: '#ef4444', marginBottom: 8 },
  retryText: { color: '#60a5fa', fontWeight: '600' },
  emptyText: { color: '#475569', marginTop: 12, fontSize: 15 },
});
