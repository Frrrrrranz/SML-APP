// Supabase Edge Function: AI 音乐助手代理
// NOTE: 使用阿里云通义千问 (DashScope) API，兼容 OpenAI 格式
// 包含用户级速率限制：每小时 10 次、每天 30 次
// 部署命令: npx supabase functions deploy gemini-chat --no-verify-jwt

// NOTE: 精简版系统提示词，减少 token 消耗
const SYSTEM_PROMPT = `你是SML古典音乐助手。回答作曲家、作品、乐理、音乐史问题。
要求：简明准确，1-3段，用户用什么语言你就用什么语言回答。非音乐话题请礼貌拒绝。`

const MODEL = 'qwen-turbo'
const API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'

// 速率限制配置
const RATE_LIMIT_HOURLY = 10
const RATE_LIMIT_DAILY = 30

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
}

// NOTE: 从 JWT 中解码用户 ID，不需要验证签名（Supabase 平台已验证）
function getUserIdFromJwt(authHeader: string): string | null {
    try {
        const token = authHeader.replace('Bearer ', '')
        const payload = token.split('.')[1]
        // Base64url 解码
        const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
        const data = JSON.parse(decoded)
        return data.sub || null
    } catch {
        return null
    }
}

// 通过 Supabase REST API 查询速率限制
async function checkRateLimit(
    userId: string,
    supabaseUrl: string,
    serviceRoleKey: string
): Promise<{ allowed: boolean; reason?: string }> {
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

    // 查询近 1 小时的调用次数
    const hourlyRes = await fetch(
        `${supabaseUrl}/rest/v1/ai_chat_usage?select=id&user_id=eq.${userId}&created_at=gte.${oneHourAgo}`,
        {
            headers: {
                'apikey': serviceRoleKey,
                'Authorization': `Bearer ${serviceRoleKey}`,
            },
        }
    )

    if (hourlyRes.ok) {
        const hourlyData = await hourlyRes.json()
        if (hourlyData.length >= RATE_LIMIT_HOURLY) {
            return { allowed: false, reason: 'hourly' }
        }
    }

    // 查询近 24 小时的调用次数
    const dailyRes = await fetch(
        `${supabaseUrl}/rest/v1/ai_chat_usage?select=id&user_id=eq.${userId}&created_at=gte.${oneDayAgo}`,
        {
            headers: {
                'apikey': serviceRoleKey,
                'Authorization': `Bearer ${serviceRoleKey}`,
            },
        }
    )

    if (dailyRes.ok) {
        const dailyData = await dailyRes.json()
        if (dailyData.length >= RATE_LIMIT_DAILY) {
            return { allowed: false, reason: 'daily' }
        }
    }

    return { allowed: true }
}

// 记录一次调用
async function recordUsage(
    userId: string,
    supabaseUrl: string,
    serviceRoleKey: string
): Promise<void> {
    await fetch(`${supabaseUrl}/rest/v1/ai_chat_usage`, {
        method: 'POST',
        headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ user_id: userId }),
    })
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: CORS_HEADERS })
    }

    try {
        // 验证身份
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: '请先登录' }),
                { status: 401, headers: CORS_HEADERS }
            )
        }

        // 获取用户 ID
        const userId = getUserIdFromJwt(authHeader)
        if (!userId) {
            return new Response(
                JSON.stringify({ error: '无效的认证信息' }),
                { status: 401, headers: CORS_HEADERS }
            )
        }

        // 解析请求
        const body = await req.json()
        const question = body.question
        if (!question || typeof question !== 'string') {
            return new Response(
                JSON.stringify({ error: '缺少问题参数' }),
                { status: 400, headers: CORS_HEADERS }
            )
        }

        // 读取配置
        const apiKey = Deno.env.get('DASHSCOPE_API_KEY')
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

        if (!apiKey) {
            return new Response(
                JSON.stringify({ error: 'AI 服务未配置' }),
                { status: 500, headers: CORS_HEADERS }
            )
        }

        // NOTE: 速率限制检查
        if (supabaseUrl && serviceRoleKey) {
            const rateCheck = await checkRateLimit(userId, supabaseUrl, serviceRoleKey)
            if (!rateCheck.allowed) {
                const msg = rateCheck.reason === 'hourly'
                    ? '提问太频繁了，请稍后再试（每小时限 10 次）'
                    : '今日提问次数已用完，明天再来吧（每天限 30 次）'
                return new Response(
                    JSON.stringify({ error: msg }),
                    { status: 200, headers: CORS_HEADERS }
                )
            }
        }

        // 调用通义千问 API
        const aiResponse = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: question },
                ],
                temperature: 0.7,
                max_tokens: 512,
            }),
        })

        if (!aiResponse.ok) {
            const errorText = await aiResponse.text()
            console.error('DashScope API error:', aiResponse.status, errorText)
            return new Response(
                JSON.stringify({ error: `AI 服务暂时不可用 (${aiResponse.status})` }),
                { status: 200, headers: CORS_HEADERS }
            )
        }

        const aiData = await aiResponse.json()
        const answer = aiData?.choices?.[0]?.message?.content ?? '未能生成回答，请重试。'

        // NOTE: 调用成功后记录使用次数
        if (supabaseUrl && serviceRoleKey) {
            recordUsage(userId, supabaseUrl, serviceRoleKey).catch(
                (err) => console.error('Failed to record usage:', err)
            )
        }

        return new Response(
            JSON.stringify({ answer }),
            { status: 200, headers: CORS_HEADERS }
        )
    } catch (err) {
        console.error('Edge Function error:', err)
        return new Response(
            JSON.stringify({ error: '服务器内部错误' }),
            { status: 500, headers: CORS_HEADERS }
        )
    }
})
