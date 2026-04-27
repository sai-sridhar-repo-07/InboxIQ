import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { supabase } from '../lib/supabase';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  const handleAuth = async () => {
    if (!email || !password) { Alert.alert('Error', 'Email and password required'); return; }
    setLoading(true);
    try {
      let error;
      if (mode === 'signin') {
        ({ error } = await supabase.auth.signInWithPassword({ email, password }));
      } else {
        ({ error } = await supabase.auth.signUp({ email, password }));
        if (!error) Alert.alert('Check your email', 'Confirmation link sent.');
      }
      if (error) Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.logo}>Mail<Text style={styles.logoBlue}>air</Text></Text>
        <Text style={styles.subtitle}>AI-powered email management</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#64748b"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#64748b"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.btn} onPress={handleAuth} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{mode === 'signin' ? 'Sign In' : 'Sign Up'}</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
          <Text style={styles.toggle}>
            {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  logo: { fontSize: 36, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 6 },
  logoBlue: { color: '#60a5fa' },
  subtitle: { color: '#64748b', textAlign: 'center', marginBottom: 40, fontSize: 15 },
  input: {
    backgroundColor: '#1e293b', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    color: '#fff', marginBottom: 12, fontSize: 15, borderWidth: 1, borderColor: '#334155',
  },
  btn: {
    backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', marginTop: 8, marginBottom: 16,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  toggle: { color: '#60a5fa', textAlign: 'center', fontSize: 14 },
});
