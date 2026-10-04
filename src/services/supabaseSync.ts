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

export const sanitizeUrl = (url?: string): string => {
  if (!url) return '';
  let clean = url.trim();
  
  // Extract project ref if user pasted dashboard URL like https://supabase.com/dashboard/project/ciyjmpqgmjdzhgqezyeu
  const dashMatch = clean.match(/supabase\.com\/dashboard\/project\/([a-z0-9]+)/i);
  if (dashMatch) {
    return `https://${dashMatch[1]}.supabase.co`;
  }

  // Ensure scheme
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = 'https://' + clean;
  }
  
  // Strip paths like /rest/v1, /auth/v1, etc.
  try {
    const parsed = new URL(clean);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    clean = clean.replace(/\/rest\/v1\/?$/i, '');
    clean = clean.replace(/\/+$/, '');
    return clean;
  }
};

let cachedClient: SupabaseClient | null = null;
let currentChannel: RealtimeChannel | null = null;

export const getSupabaseConfig = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  let localUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_URL_KEY) || '' : '';
  let localKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_KEY) || '' : '';
  const isDisabled = typeof window !== 'undefined' && localStorage.getItem('household_cloud_disabled') === 'true';

  if (isDisabled) {
    return {
      url: '',
      anonKey: '',
      isConfigured: false,
      isFromEnv: false,
      isDefault: false,
      isDisabled: true,
    };
  }

  // Auto-import credentials from URL query params (for 1-click mobile connect from LINE/chat)
  if (typeof window !== 'undefined') {
    try {
      const params = new URLSearchParams(window.location.search);
      const paramUrl = params.get('sb_url') || params.get('supabase_url');
      const paramKey = params.get('sb_key') || params.get('supabase_key');
      if (paramUrl && paramKey) {
        localUrl = sanitizeUrl(paramUrl);
        localKey = paramKey.trim();
        localStorage.setItem(STORAGE_URL_KEY, localUrl);
        localStorage.setItem(STORAGE_KEY_KEY, localKey);
        localStorage.removeItem('household_cloud_disabled');
        // Clean params from address bar smoothly
        const newUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, newUrl);
      }
    } catch {
      // Ignore URL parsing errors
    }
  }

  const resolvedUrl = sanitizeUrl(localUrl || envUrl || '');
  const anonKey = (localKey || envKey || '').trim();

  return {
    url: resolvedUrl,
    anonKey,
    isConfigured: Boolean(resolvedUrl && anonKey),
    isFromEnv: Boolean(envUrl && envKey),
    isDefault: false,
    isDisabled: false,
  };
};

/**
 * Generates an instant 1-click setup link to open on Mobile
 */
export const getMobileSyncShareLink = (): string => {
  if (typeof window === 'undefined') return '';
  const { url, anonKey, isConfigured } = getSupabaseConfig();
  if (!isConfigured) return '';
  const base = window.location.origin + window.location.pathname;
  return `${base}?sb_url=${encodeURIComponent(url)}&sb_key=${encodeURIComponent(anonKey)}`;
};

export const saveSupabaseConfig = (url: string, anonKey: string) => {
  localStorage.setItem(STORAGE_URL_KEY, sanitizeUrl(url));
  localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
  localStorage.removeItem('household_cloud_disabled');
  cachedClient = null;
};

export const clearSupabaseConfig = () => {
  localStorage.removeItem(STORAGE_URL_KEY);
  localStorage.removeItem(STORAGE_KEY_KEY);
  localStorage.setItem('household_cloud_disabled', 'true');
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

export const testSupabaseConnection = async (
  overrideUrl?: string,
  overrideKey?: string
): Promise<{ success: boolean; message: string }> => {
  let client: SupabaseClient | null = null;

  if (overrideUrl && overrideKey) {
    const cleanUrl = sanitizeUrl(overrideUrl);
    const cleanKey = overrideKey.trim();
    if (!cleanUrl || !cleanKey) {
      return { success: false, message: 'กรุณาระบุทั้ง Supabase URL และ Anon Key ให้ครบถ้วน' };
    }
    client = createClient(cleanUrl, cleanKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } else {
    client = getSupabaseClient();
  }

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
      if (error.code === '42P01' || error.code === 'PGRST205') {
        return {
          success: false,
          message: 'เชื่อมต่อ Supabase ได้แล้ว! แต่ยังไม่ได้รันคำสั่ง SQL สร้างตาราง household_state (กรุณาคัดลอก SQL ด้านล่างไปรันใน Supabase SQL Editor)',
        };
      }
      if (error.code === '42501') {
        return {
          success: false,
          message: 'Supabase ติด Row Level Security (42501): กรุณารันคำสั่งใน Supabase SQL Editor: ALTER TABLE household_state DISABLE ROW LEVEL SECURITY;',
        };
      }
      return { success: false, message: 'ข้อผิดพลาดจาก Supabase (' + (error.code || 'ERR') + '): ' + error.message };
    }

    return {
      success: true,
      message: data ? 'เชื่อมต่อฐานข้อมูลและพบข้อมูลล่าสุดเรียบร้อยแล้ว' : 'เชื่อมต่อฐานข้อมูลสำเร็จ (พร้อมเริ่มต้นบันทึกข้อมูลและซิงค์ทันที)',
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
  onRemoteChange: (data: HouseholdCloudData) => void,
  onStatusChange?: (status: 'connected' | 'syncing' | 'offline' | 'error') => void
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
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        onStatusChange?.('connected');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        onStatusChange?.('error');
      }
    });

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

-- อนุญาตให้อ่านและเขียนข้อมูลผ่าน Anon Key
ALTER TABLE household_state DISABLE ROW LEVEL SECURITY;

-- หรือหากเปิด RLS ให้สร้าง Policy อนุญาตให้อ่านและเขียนได้:
DROP POLICY IF EXISTS "household_state_all_access" ON household_state;
CREATE POLICY "household_state_all_access" ON household_state FOR ALL USING (true) WITH CHECK (true);

-- เปิดใช้งาน Realtime การส่งข้อมูลสด
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'household_state'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE household_state;
  END IF;
END $$;
`;
