import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { billingApi, apiErrorMessage } from '../lib/api';

const PLAN_STYLES: Record<string, { border: string; badge: string; badgeText: string; icon: string }> = {
  free:   { border: '#334155', badge: '#1e293b',  badgeText: '#94a3b8',  icon: '🆓' },
  pro:    { border: '#2563eb', badge: '#1e3a8a',  badgeText: '#93c5fd',  icon: '⚡' },
  agency: { border: '#7c3aed', badge: '#2e1065',  badgeText: '#c4b5fd',  icon: '🏢' },
};

const PLAN_FEATURES: Record<string, string[]> = {
  free:   ['100 emails/month', 'AI summaries', '3 actions/day', 'Basic inbox'],
  pro:    ['2,000 emails/month', 'AI reply generation', 'Unlimited actions', 'Revenue tracking', 'Relationships', 'Knowledge base'],
  agency: ['Unlimited emails', 'Team management', 'Custom sequences', 'Priority support', 'API access', 'All Pro features'],
};

export default function BillingScreen() {
  const [billing, setBilling] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await billingApi.getStatus();
      setBilling(data);
      setError('');
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to load billing info'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const plan = billing?.plan || 'free';
  const ps = PLAN_STYLES[plan] || PLAN_STYLES.free;
  const features = PLAN_FEATURES[plan] || PLAN_FEATURES.free;

  if (loading) return <View style={styles.centered}><ActivityIndicator color="#60a5fa" size="large" /></View>;

  if (error) return (
    <View style={styles.centered}>
      <Ionicons name="wifi-outline" size={48} color="#334155" />
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={load}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#60a5fa" />}
    >
      {/* Current Plan Card */}
      <View style={[styles.planCard, { borderColor: ps.border }]}>
        <View style={styles.planHeader}>
          <Text style={styles.planIcon}>{ps.icon}</Text>
          <View style={styles.planInfo}>
            <Text style={styles.planTitle}>{plan.charAt(0).toUpperCase() + plan.slice(1)} Plan</Text>
            {billing?.subscription_status && (
              <Text style={styles.planStatus}>{billing.subscription_status}</Text>
            )}
          </View>
          <View style={[styles.planBadge, { backgroundColor: ps.badge }]}>
            <Text style={[styles.planBadgeText, { color: ps.badgeText }]}>Current</Text>
          </View>
        </View>

        {billing?.current_period_end && (
          <Text style={styles.renewDate}>
            Renews {new Date(billing.current_period_end).toLocaleDateString()}
          </Text>
        )}

        <View style={styles.featureList}>
          {features.map(f => (
            <View key={f} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Usage */}
      {billing?.usage && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Usage This Month</Text>
          {Object.entries(billing.usage as Record<string, unknown>).map(([key, val]) => (
            <View key={key} style={styles.usageRow}>
              <Text style={styles.usageLabel}>{key.replace(/_/g, ' ')}</Text>
              <Text style={styles.usageVal}>{String(val)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Upgrade CTA */}
      {plan === 'free' && (
        <View style={styles.upgradeBox}>
          <Ionicons name="rocket-outline" size={24} color="#a78bfa" style={{ marginBottom: 8 }} />
          <Text style={styles.upgradeTitle}>Upgrade to Pro</Text>
          <Text style={styles.upgradeSub}>Get AI replies, revenue tracking, and 20x more emails</Text>
          <TouchableOpacity
            style={styles.upgradeBtn}
            onPress={() => Linking.openURL('https://mailair.in/billing')}
          >
            <Text style={styles.upgradeBtnText}>View Plans — mailair.in</Text>
          </TouchableOpacity>
        </View>
      )}

      {plan === 'pro' && (
        <View style={styles.upgradeBox}>
          <Ionicons name="business-outline" size={24} color="#a78bfa" style={{ marginBottom: 8 }} />
          <Text style={styles.upgradeTitle}>Upgrade to Agency</Text>
          <Text style={styles.upgradeSub}>Team features, unlimited emails, custom sequences</Text>
          <TouchableOpacity
            style={styles.upgradeBtn}
            onPress={() => Linking.openURL('https://mailair.in/billing')}
          >
            <Text style={styles.upgradeBtnText}>Upgrade — mailair.in</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.manageNote}>
        Manage subscription, invoices, and payment methods at mailair.in/billing
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText: { color: '#ef4444', marginTop: 12, marginBottom: 16, textAlign: 'center' },
  retryBtn: { backgroundColor: '#1e293b', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: '#60a5fa', fontWeight: '600' },
  planCard: { backgroundColor: '#1e293b', borderRadius: 18, padding: 18, borderWidth: 2, marginBottom: 16 },
  planHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  planIcon: { fontSize: 28 },
  planInfo: { flex: 1 },
  planTitle: { color: '#f1f5f9', fontSize: 18, fontWeight: '800' },
  planStatus: { color: '#64748b', fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  planBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  planBadgeText: { fontSize: 11, fontWeight: '700' },
  renewDate: { color: '#64748b', fontSize: 12, marginBottom: 14 },
  featureList: { gap: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { color: '#cbd5e1', fontSize: 14 },
  section: { backgroundColor: '#1e293b', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#334155', marginBottom: 16 },
  sectionTitle: { color: '#94a3b8', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  usageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#0f172a' },
  usageLabel: { color: '#cbd5e1', fontSize: 14, textTransform: 'capitalize' },
  usageVal: { color: '#f1f5f9', fontSize: 14, fontWeight: '700' },
  upgradeBox: { backgroundColor: '#1e1b4b', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#312e81', alignItems: 'center', marginBottom: 16 },
  upgradeTitle: { color: '#e0e7ff', fontSize: 18, fontWeight: '700', marginBottom: 6 },
  upgradeSub: { color: '#818cf8', fontSize: 13, textAlign: 'center', lineHeight: 18, marginBottom: 16 },
  upgradeBtn: { backgroundColor: '#4f46e5', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  upgradeBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  manageNote: { color: '#334155', fontSize: 12, textAlign: 'center' },
});
