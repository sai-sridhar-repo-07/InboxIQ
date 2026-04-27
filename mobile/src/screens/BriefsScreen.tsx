import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { briefsApi, apiErrorMessage } from '../lib/api';

function BriefItem({ item }: { item: any }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <TouchableOpacity style={styles.item} onPress={() => setExpanded(e => !e)} activeOpacity={0.8}>
      <View style={styles.itemHeader}>
        <View style={styles.iconBox}>
          <Ionicons name="newspaper-outline" size={18} color="#a78bfa" />
        </View>
        <View style={styles.itemBody}>
          <Text style={styles.title} numberOfLines={expanded ? undefined : 1}>{item.subject || 'Meeting Brief'}</Text>
          {item.contact_name && <Text style={styles.contact}>{item.contact_name}</Text>}
          {item.created_at && <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>}
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#475569" />
      </View>
      {expanded && item.content && (
        <Text style={styles.content}>{item.content}</Text>
      )}
    </TouchableOpacity>
  );
}

export default function BriefsScreen() {
  const [briefs, setBriefs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await briefsApi.getAll();
      setBriefs(Array.isArray(data) ? data : data.briefs || []);
      setError('');
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to load briefs'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

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
          data={briefs}
          keyExtractor={i => i.id}
          renderItem={({ item }) => <BriefItem item={item} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#60a5fa" />}
          contentContainerStyle={{ paddingVertical: 8 }}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="newspaper-outline" size={48} color="#334155" />
              <Text style={styles.emptyText}>No briefs yet</Text>
              <Text style={styles.emptySub}>Generate briefs from email detail view</Text>
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
  itemHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  iconBox: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#2e1065', justifyContent: 'center', alignItems: 'center' },
  itemBody: { flex: 1 },
  title: { color: '#e2e8f0', fontSize: 14, fontWeight: '600', marginBottom: 3 },
  contact: { color: '#a78bfa', fontSize: 12, marginBottom: 2 },
  date: { color: '#475569', fontSize: 11 },
  content: { color: '#94a3b8', fontSize: 13, lineHeight: 20, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#334155' },
  errorBox: { margin: 16, backgroundColor: '#1e293b', borderRadius: 12, padding: 16, alignItems: 'center' },
  errorText: { color: '#ef4444', marginBottom: 8 },
  retryText: { color: '#60a5fa', fontWeight: '600' },
  emptyText: { color: '#475569', marginTop: 12, fontSize: 15 },
  emptySub: { color: '#334155', fontSize: 13, marginTop: 4 },
});
