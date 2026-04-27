import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { repliesApi, emailsApi, apiErrorMessage } from '../lib/api';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ComposeReply'>;

export default function ComposeReplyScreen({ route, navigation }: Props) {
  const { emailId, subject } = route.params;
  const [body, setBody] = useState('');
  const [draftId, setDraftId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(true);

  useEffect(() => {
    repliesApi.getDraft(emailId)
      .then(d => {
        if (d?.id) { setDraftId(d.id); setBody(d.body || ''); }
      })
      .catch(() => {})
      .finally(() => setLoadingDraft(false));
  }, [emailId]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const data = await emailsApi.generateReply(emailId);
      const text = data.reply || data.draft || '';
      setBody(text);
    } catch (err) {
      Toast.show({ type: 'error', text1: apiErrorMessage(err, 'Failed to generate reply') });
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!body.trim()) { Alert.alert('Empty', 'Reply body cannot be empty'); return; }
    setSending(true);
    try {
      if (draftId) {
        await repliesApi.updateDraft(draftId, body);
        await repliesApi.sendDraft(draftId);
      } else {
        Toast.show({ type: 'error', text1: 'No draft found. Generate a reply first.' });
        setSending(false);
        return;
      }
      Toast.show({ type: 'success', text1: 'Reply sent!' });
      navigation.goBack();
    } catch (err) {
      Toast.show({ type: 'error', text1: apiErrorMessage(err, 'Failed to send reply') });
    } finally {
      setSending(false);
    }
  };

  if (loadingDraft) return (
    <View style={styles.centered}><ActivityIndicator color="#60a5fa" size="large" /></View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <View style={styles.metaBox}>
          <Text style={styles.metaLabel}>Re:</Text>
          <Text style={styles.metaValue} numberOfLines={2}>{subject}</Text>
        </View>

        <ScrollView style={styles.bodyScroll} contentContainerStyle={{ padding: 16 }}>
          <TextInput
            style={styles.bodyInput}
            multiline
            value={body}
            onChangeText={setBody}
            placeholder="Write your reply..."
            placeholderTextColor="#475569"
            textAlignVertical="top"
          />
        </ScrollView>

        <View style={styles.toolbar}>
          <TouchableOpacity
            style={[styles.aiBtn, generating && styles.btnDisabled]}
            onPress={handleGenerate}
            disabled={generating}
          >
            {generating
              ? <ActivityIndicator color="#fff" size="small" />
              : <><Ionicons name="sparkles" size={16} color="#fff" /><Text style={styles.aiBtnText}>AI Draft</Text></>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sendBtn, sending && styles.btnDisabled]}
            onPress={handleSend}
            disabled={sending}
          >
            {sending
              ? <ActivityIndicator color="#fff" size="small" />
              : <><Ionicons name="send" size={16} color="#fff" /><Text style={styles.sendBtnText}>Send</Text></>
            }
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  metaBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#1e293b',
  },
  metaLabel: { color: '#475569', fontSize: 13, fontWeight: '600', marginTop: 1 },
  metaValue: { flex: 1, color: '#94a3b8', fontSize: 13, lineHeight: 18 },
  bodyScroll: { flex: 1 },
  bodyInput: {
    color: '#e2e8f0', fontSize: 15, lineHeight: 24,
    minHeight: 200,
  },
  toolbar: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: '#1e293b', backgroundColor: '#0f172a',
  },
  aiBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#4f46e5', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18,
  },
  aiBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  sendBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 12,
  },
  sendBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnDisabled: { opacity: 0.6 },
});
