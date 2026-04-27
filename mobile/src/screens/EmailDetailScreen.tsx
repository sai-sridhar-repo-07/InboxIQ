import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { emailsApi, apiErrorMessage } from '../lib/api';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'EmailDetail'>;

const PRIORITY_BADGE: Record<string, { bg: string; text: string }> = {
  high: { bg: '#7f1d1d', text: '#fca5a5' },
  medium: { bg: '#78350f', text: '#fcd34d' },
  low: { bg: '#14532d', text: '#86efac' },
};

export default function EmailDetailScreen({ route, navigation }: Props) {
  const { emailId } = route.params;
  const [email, setEmail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generatingReply, setGeneratingReply] = useState(false);
  const [reply, setReply] = useState('');

  useEffect(() => {
    emailsApi.getEmail(emailId)
      .then(e => { setEmail(e); if (!e.is_read) emailsApi.markRead(emailId).catch(() => {}); })
      .catch(() => navigation.goBack())
      .finally(() => setLoading(false));
  }, [emailId]);

  const handleGenerateReply = async () => {
    setGeneratingReply(true);
    try {
      const data = await emailsApi.generateReply(emailId);
      setReply(data.reply || data.draft || '');
    } catch (err) {
      Toast.show({ type: 'error', text1: apiErrorMessage(err, 'Failed to generate reply') });
    } finally {
      setGeneratingReply(false);
    }
  };

  const handleStar = async () => {
    try {
      await emailsApi.star(emailId);
      setEmail((e: any) => e ? { ...e, is_starred: !e.is_starred } : e);
    } catch {}
  };

  const handleArchive = async () => {
    Alert.alert('Archive', 'Archive this email?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive', onPress: async () => {
          try {
            await emailsApi.archive(emailId);
            navigation.goBack();
          } catch (err) {
            Toast.show({ type: 'error', text1: apiErrorMessage(err, 'Archive failed') });
          }
        },
      },
    ]);
  };

  if (loading) return (
    <View style={styles.centered}><ActivityIndicator color="#60a5fa" size="large" /></View>
  );

  if (!email) return null;

  const ai = email.ai_analysis;
  const priority = ai?.priority_level;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Subject */}
        <Text style={styles.subject}>{email.subject}</Text>

        {/* Meta */}
        <View style={styles.metaRow}>
          <View style={styles.metaLeft}>
            <Text style={styles.from}>{email.from_name || email.from_email}</Text>
            <Text style={styles.fromEmail}>{email.from_email}</Text>
            <Text style={styles.time}>{new Date(email.received_at).toLocaleString()}</Text>
          </View>
          {priority && (
            <View style={[styles.badge, { backgroundColor: PRIORITY_BADGE[priority]?.bg }]}>
              <Text style={[styles.badgeText, { color: PRIORITY_BADGE[priority]?.text }]}>{priority}</Text>
            </View>
          )}
        </View>

        {/* AI Summary */}
        {ai?.summary && (
          <View style={styles.summaryBox}>
            <View style={styles.summaryHeader}>
              <Ionicons name="sparkles" size={14} color="#818cf8" />
              <Text style={styles.summaryLabel}>AI Summary</Text>
            </View>
            <Text style={styles.summaryText}>{ai.summary}</Text>
            {ai.key_topics?.length > 0 && (
              <View style={styles.topics}>
                {ai.key_topics.map((t: string) => (
                  <View key={t} style={styles.topic}><Text style={styles.topicText}>{t}</Text></View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Body */}
        <View style={styles.bodyBox}>
          <Text style={styles.bodyText}>{email.body_text || email.snippet}</Text>
        </View>

        {/* AI Reply */}
        {reply ? (
          <View style={styles.replyBox}>
            <Text style={styles.replyLabel}>AI Draft Reply</Text>
            <Text style={styles.replyText}>{reply}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Action bar */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleStar}>
          <Ionicons name={email.is_starred ? 'star' : 'star-outline'} size={22} color={email.is_starred ? '#f59e0b' : '#64748b'} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleArchive}>
          <Ionicons name="archive-outline" size={22} color="#64748b" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.replyBtn, generatingReply && styles.replyBtnDisabled]} onPress={handleGenerateReply} disabled={generatingReply}>
          {generatingReply
            ? <ActivityIndicator color="#fff" size="small" />
            : <><Ionicons name="sparkles" size={16} color="#fff" /><Text style={styles.replyBtnText}>AI Reply</Text></>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20, paddingBottom: 100 },
  subject: { color: '#f1f5f9', fontSize: 18, fontWeight: '700', marginBottom: 16, lineHeight: 26 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  metaLeft: { flex: 1 },
  from: { color: '#e2e8f0', fontWeight: '600', fontSize: 14 },
  fromEmail: { color: '#64748b', fontSize: 12, marginTop: 2 },
  time: { color: '#475569', fontSize: 12, marginTop: 4 },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 12 },
  badgeText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  summaryBox: { backgroundColor: '#1e1b4b', borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#312e81' },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  summaryLabel: { color: '#818cf8', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryText: { color: '#c7d2fe', fontSize: 14, lineHeight: 20 },
  topics: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  topic: { backgroundColor: '#312e81', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  topicText: { color: '#a5b4fc', fontSize: 12 },
  bodyBox: { backgroundColor: '#1e293b', borderRadius: 14, padding: 16, marginBottom: 16 },
  bodyText: { color: '#94a3b8', fontSize: 14, lineHeight: 22 },
  replyBox: { backgroundColor: '#0c2a1e', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#166534' },
  replyLabel: { color: '#4ade80', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' },
  replyText: { color: '#d1fae5', fontSize: 14, lineHeight: 22 },
  actions: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: '#0f172a', borderTopWidth: 1, borderTopColor: '#1e293b', gap: 8,
  },
  actionBtn: { backgroundColor: '#1e293b', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#334155' },
  replyBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 13,
  },
  replyBtnDisabled: { opacity: 0.6 },
  replyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
