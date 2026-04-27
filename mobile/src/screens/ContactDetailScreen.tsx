import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { relationshipsApi, apiErrorMessage } from '../lib/api';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ContactDetail'>;

const SENTIMENT_COLOR: Record<string, string> = {
  positive: '#10b981', neutral: '#f59e0b', negative: '#ef4444',
};

export default function ContactDetailScreen({ route }: Props) {
  const { contactEmail, contactName } = route.params;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    relationshipsApi.getSentiment(contactEmail)
      .then(d => setData(d))
      .catch(err => setError(apiErrorMessage(err, 'Failed to load contact')))
      .finally(() => setLoading(false));
  }, [contactEmail]);

  if (loading) return <View style={styles.centered}><ActivityIndicator color="#60a5fa" size="large" /></View>;

  const score = data?.relationship_score ?? 0;
  const scoreColor = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: avatarColor(contactEmail) }]}>
          <Text style={styles.avatarText}>{contactName[0].toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{contactName}</Text>
        <Text style={styles.email}>{contactEmail}</Text>
      </View>

      {error ? (
        <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>
      ) : data ? (
        <>
          <View style={styles.scoreCard}>
            <Text style={[styles.bigScore, { color: scoreColor }]}>{score}</Text>
            <Text style={styles.scoreLabel}>Relationship Score</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{data.email_count ?? 0}</Text>
              <Text style={styles.statLabel}>Emails</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{data.response_rate != null ? `${Math.round(data.response_rate * 100)}%` : '—'}</Text>
              <Text style={styles.statLabel}>Response Rate</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: SENTIMENT_COLOR[data.overall_sentiment] || '#94a3b8' }]}>
                {data.overall_sentiment || '—'}
              </Text>
              <Text style={styles.statLabel}>Sentiment</Text>
            </View>
          </View>

          {data.sentiment_history?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Sentiment</Text>
              {data.sentiment_history.slice(0, 5).map((s: any, i: number) => (
                <View key={i} style={styles.sentimentRow}>
                  <View style={[styles.sentimentDot, { backgroundColor: SENTIMENT_COLOR[s.sentiment] || '#64748b' }]} />
                  <Text style={styles.sentimentText} numberOfLines={1}>{s.subject || 'No subject'}</Text>
                  <Text style={styles.sentimentDate}>{new Date(s.date).toLocaleDateString()}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      ) : null}
    </ScrollView>
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
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  header: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 28 },
  name: { color: '#f1f5f9', fontSize: 20, fontWeight: '700', marginBottom: 4 },
  email: { color: '#64748b', fontSize: 14 },
  scoreCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#334155', marginBottom: 16 },
  bigScore: { fontSize: 48, fontWeight: '800' },
  scoreLabel: { color: '#64748b', fontSize: 13, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: '#1e293b', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  statNum: { color: '#f1f5f9', fontSize: 18, fontWeight: '700', marginBottom: 2 },
  statLabel: { color: '#64748b', fontSize: 11 },
  section: { backgroundColor: '#1e293b', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#334155' },
  sectionTitle: { color: '#94a3b8', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  sentimentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  sentimentDot: { width: 8, height: 8, borderRadius: 4 },
  sentimentText: { flex: 1, color: '#cbd5e1', fontSize: 13 },
  sentimentDate: { color: '#475569', fontSize: 11 },
  errorBox: { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, alignItems: 'center' },
  errorText: { color: '#ef4444' },
});
