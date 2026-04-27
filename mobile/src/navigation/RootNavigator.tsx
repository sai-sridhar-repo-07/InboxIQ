import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabNavigator from './TabNavigator';
import EmailDetailScreen from '../screens/EmailDetailScreen';
import ComposeReplyScreen from '../screens/ComposeReplyScreen';
import ContactDetailScreen from '../screens/ContactDetailScreen';
import RelationshipsScreen from '../screens/RelationshipsScreen';
import RevenueScreen from '../screens/RevenueScreen';
import QuotesScreen from '../screens/QuotesScreen';
import SequencesScreen from '../screens/SequencesScreen';
import BriefsScreen from '../screens/BriefsScreen';
import KnowledgeScreen from '../screens/KnowledgeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import BillingScreen from '../screens/BillingScreen';
import SLAScreen from '../screens/SLAScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0f172a' },
        headerTintColor: '#f1f5f9',
        headerShadowVisible: false,
        contentStyle: { backgroundColor: '#0f172a' },
      }}
    >
      <Stack.Screen name="Main" component={TabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="EmailDetail" component={EmailDetailScreen} options={{ title: 'Email' }} />
      <Stack.Screen name="ComposeReply" component={ComposeReplyScreen} options={{ title: 'Reply' }} />
      <Stack.Screen name="ContactDetail" component={ContactDetailScreen}
        options={({ route }) => ({ title: route.params.contactName })} />
      <Stack.Screen name="Relationships" component={RelationshipsScreen} options={{ title: 'Relationships' }} />
      <Stack.Screen name="Revenue" component={RevenueScreen} options={{ title: 'Revenue' }} />
      <Stack.Screen name="Quotes" component={QuotesScreen} options={{ title: 'Quotes' }} />
      <Stack.Screen name="Sequences" component={SequencesScreen} options={{ title: 'Sequences' }} />
      <Stack.Screen name="Briefs" component={BriefsScreen} options={{ title: 'Briefs' }} />
      <Stack.Screen name="Knowledge" component={KnowledgeScreen} options={{ title: 'Knowledge' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      <Stack.Screen name="Billing" component={BillingScreen} options={{ title: 'Billing & Plan' }} />
      <Stack.Screen name="SLA" component={SLAScreen} options={{ title: 'SLA Tracker' }} />
    </Stack.Navigator>
  );
}
