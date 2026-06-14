import { createClient } from '@supabase/supabase-js'

// 💡 换成你真实的 Supabase 凭证（末尾千万别带 /rest/v1/ 啦）
const supabaseUrl = 'https://jfroowkcbhzyqaugscka.supabase.co'
const supabaseKey = 'sb_publishable_uqdm6SabntYVsMzzKh59wg_bLtCYfkn'

export const supabase = createClient(supabaseUrl, supabaseKey)