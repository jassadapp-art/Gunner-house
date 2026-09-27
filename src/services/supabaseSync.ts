import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { HouseholdSettings, MonthlyExpense, SavingsGoal, Transaction } from '../types';

export interface HouseholdCloudData {
  settings: HouseholdSettings;
  goals: SavingsGoal[];
  transactions: Transaction[];
  expenses: MonthlyExpense[];
  updated_at?: string;
}

const STORAGE_URL_KEY = 'household_supabase_url';
const STORAGE_KEY_KEY = 'household_supabase_anon_key';

let cachedClient: SupabaseClient | null = null;
let currentChannel: RealtimeChannel | null = null;

export const getSupabaseConfig = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  const localUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_URL_KEY) || '' : '';
  const localKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_KEY) || '' : '';

  const url = (envUrl && envUrl.trim()) || localUrl.trim();
  const anonKey = (envKey && envKey.trim()) || localKey.trim();

  return {
    url,
    anonKey,
    isConfigured: Boolean(url && anonKey),
    isFromEnv: Boolean(envUrl && envKey),
  };
};

export const saveSupabaseConfig = (url: string, anonKey: string) => {
  localStorage.setItem(STORAGE_URL_KEY, url.trim());
  localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
  cachedClient = null;
};

export const clearSupabaseConfig = () => {
  localStorage.removeItem(STORAGE_URL_KEY);
  localStorage.removeItem(STORAGE_KEY_KEY);
  if (currentChannel) {
    currentChannel.unsubscribe();
    currentChannel = null;
  }
  cachedClient = null;
};

export const getSupabaseClient = (): SupabaseClient | null => {
  const { url, anonKey, isConfigured } = getSupabaseConfig();
  if (!isConfigured) return null;

  if (!cachedClient) {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }

  return cachedClient;
};

export const testSupabaseConnection = async (): Promise<{ success: boolean; message: string }> => {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'ยังไม่ได้ระบุ Supabase URL หรือ Anon Key' };
  }

  try {
    const { data, error } = await client
      .from('household_state')
      .select('id, updated_at')
      .eq('id', 'main')
      .maybeSingle();

    if (error) {
      if (error.code === '42P01') {
        return {
          success: false,
          message: 'พบการเชื่อมต่อ แต่ยังไม่ได้สร้างตาราง household_state ใน Supabase (กรุณารันคำสั่ง SQL)',
        };
      }
      return { success: false, message: 'ข้อผิดพลาดจาก Supabase: ' + error.message };
    }

    return {
      success: true,
      message: data ? 'เชื่อมต่อฐานข้อมูลและพบข้อมูลเรียบร้อยแล้ว' : 'เชื่อมต่อฐานข้อมูลสำเร็จ (พร้อมเริ่มต้นบันทึกข้อมูล)',
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'ไม่สามารถเชื่อมต่อได้ ตรวจสอบ URL อีกครั้ง' };
  }
};

export const fetchCloudHouseholdData = async (): Promise<HouseholdCloudData | null> => {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('household_state')
      .select('*')
      .eq('id', 'main')
      .maybeSingle();

    if (error) {
      console.warn('Error fetching cloud household data:', error);
      return null;
    }

    if (!data) return null;

    return {
      settings: data.settings,
      goals: data.goals,
      transactions: data.transactions,
      expenses: data.expenses,
      updated_at: data.updated_at,
    };
  } catch (err) {
    console.error('Failed to fetch from cloud:', err);
    return null;
  }
};

export const pushCloudHouseholdData = async (data: HouseholdCloudData): Promise<boolean> => {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const payload = {
      id: 'main',
      settings: data.settings,
      goals: data.goals,
      transactions: data.transactions,
      expenses: data.expenses,
      updated_at: new Date().toISOString(),
    };

    const { error } = await client
      .from('household_state')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.error('Failed to push household data to Supabase:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Exception pushing to Supabase:', err);
    return false;
  }
};

export const subscribeToCloudChanges = (
  onRemoteChange: (data: HouseholdCloudData) => void
): (() => void) => {
  const client = getSupabaseClient();
  if (!client) return () => {};

  if (currentChannel) {
    currentChannel.unsubscribe();
    currentChannel = null;
  }

  const channel = client
    .channel('public:household_state')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'household_state',
        filter: 'id=eq.main',
      },
      (payload) => {
        if (payload.new && (payload.new as any).settings) {
          const newData = payload.new as any;
          onRemoteChange({
            settings: newData.settings,
            goals: newData.goals,
            transactions: newData.transactions,
            expenses: newData.expenses,
            updated_at: newData.updated_at,
          });
        }
      }
    )
    .subscribe();

  currentChannel = channel;

  return () => {
    channel.unsubscribe();
  };
};

export const SUPABASE_SQL_SETUP = `-- คำสั่ง SQL สำหรับสร้างตารางใน Supabase
-- คัดลอกข้อความนี้ทั้งหมด ไปวางในแถบ 'SQL Editor' บน Supabase แล้วกดปุ่ม 'Run'

CREATE TABLE IF NOT EXISTS household_state (
  id TEXT PRIMARY KEY DEFAULT 'main',
  settings JSONB NOT NULL,
  goals JSONB NOT NULL,
  transactions JSONB NOT NULL,
  expenses JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- เปิดใช้งาน Realtime การส่งข้อมูลสด
ALTER PUBLICATION supabase_realtime ADD TABLE household_state;

-- อนุญาตให้อ่านเขียนข้อมูลผ่าน Anon Key
ALTER TABLE household_state DISABLE ROW LEVEL SECURITY;
`;
