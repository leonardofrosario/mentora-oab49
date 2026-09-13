// Mentora OAB 49 - Supabase Edge Function
// Pesquisa o LexML oficial e usa Gemini somente para explicar o material recuperado.
// Secrets necessários no Supabase:
// GEMINI_API_KEY
// GEMINI_MODEL (opcional; padrão gemini-3.7-flash)
// ALLOWED_ORIGIN (opcional; padrão https://leonardofrosario.github.io)
// MAX_AI_DAILY (opcional; padrão 60)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = (origin: string) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
});

const decodeXml = (s = '') => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&amp;/g, '&')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const tag = (xml: string, names: string[]) => {
  for (const name of names) {
    const escaped = name.replace(':', '\\:');
    const re = new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, 'i');
    const m = xml.match(re);
    if (m?.[1]) return decodeXml(m[1]);
  }
  return '';
};

function parseLexml(xml: string) {
  const blocks = [...xml.matchAll(/<srw:recordData>([\s\S]*?)<\/srw:recordData>/gi)].map(m => m[1]);
  return blocks.map((b, idx) => {
    const title = tag(b, ['dc:title', 'title']);
    const description = tag(b, ['dc:description', 'description']);
    const urn = tag(b, ['urn']);
    const identifier = tag(b, ['dc:identifier', 'identifier']);
    const documentType = tag(b, ['tipoDocumento', 'dc:type', 'type']);
    const date = tag(b, ['dc:date', 'date']);
    const subject = tag(b, ['dc:subject', 'subject']);
    const url = urn
      ? `https://www.lexml.gov.br/urn/${urn}`
      : (identifier?.startsWith('http') ? identifier : 'https://www.lexml.gov.br/busca/');
    return { index: idx + 1, title, description, urn, identifier, documentType, date, subject, url };
  }).filter(x => x.title || x.description || x.urn);
}

function safeCql(text: string) {
  const clean = text.replace(/["\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 220);
  // Pesquisa título e descrição; mantém a consulta simples para o SRU do LexML.
  return `(dc.title any "${clean}") or (dc.description any "${clean}")`;
}

Deno.serve(async (req) => {
  const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') || 'https://leonardofrosario.github.io';
  const requestOrigin = req.headers.get('origin') || allowedOrigin;
  const origin = requestOrigin === allowedOrigin ? requestOrigin : allowedOrigin;
  const cors = corsHeaders(origin);

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: cors });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization') || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return Response.json({ error: 'unauthorized' }, { status: 401, headers: cors });
    }

    const body = await req.json();
    const query = String(body?.query || '').trim();
    const mode = ['explain', 'quiz', 'research'].includes(body?.mode) ? body.mode : 'explain';
    const discipline = String(body?.discipline || '').trim().slice(0, 80);
    const maxResults = Math.max(3, Math.min(10, Number(body?.maxResults || 6)));

    if (query.length < 4 || query.length > 800) {
      return Response.json({ error: 'invalid_query' }, { status: 400, headers: cors });
    }

    // Limite simples por usuário para manter o uso previsível no free tier.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const maxDaily = Math.max(5, Number(Deno.env.get('MAX_AI_DAILY') || '60'));
    const { count } = await supabase
      .from('ai_interactions')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since);
    if ((count || 0) >= maxDaily) {
      return Response.json({ error: 'daily_limit', message: 'Limite diário do tutor com IA atingido.' }, { status: 429, headers: cors });
    }

    const cql = safeCql(query);
    const url = new URL('https://www.lexml.gov.br/busca/SRU');
    url.searchParams.set('operation', 'searchRetrieve');
    url.searchParams.set('version', '1.1');
    url.searchParams.set('query', cql);
    url.searchParams.set('maximumRecords', String(maxResults));
    url.searchParams.set('startRecord', '1');
    url.searchParams.set('recordSchema', 'dc');

    const lexmlRes = await fetch(url.toString(), {
      headers: { 'Accept': 'application/xml,text/xml;q=0.9,*/*;q=0.8', 'User-Agent': 'MentoraOAB49/1.0 educational-app' },
      signal: AbortSignal.timeout(12000),
    });
    if (!lexmlRes.ok) throw new Error(`LexML HTTP ${lexmlRes.status}`);
    const xml = await lexmlRes.text();
    const sources = parseLexml(xml).slice(0, maxResults);

    if (!sources.length) {
      await supabase.from('ai_interactions').insert({
        user_id: userData.user.id,
        query,
        mode,
        discipline: discipline || null,
        response_text: 'Nenhuma fonte suficiente foi localizada no LexML.',
        sources: [],
        model: null,
      });
      return Response.json({
        status: 'insufficient_sources',
        answer: 'Não encontrei fonte jurídica suficiente no LexML para responder com segurança. Tente reformular usando o nome da lei, artigo, instituto ou tribunal.',
        sources: [],
      }, { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const sourceText = sources.map((s, i) => [
      `[${i + 1}] ${s.title || s.documentType || 'Documento'}`,
      s.documentType ? `Tipo: ${s.documentType}` : '',
      s.date ? `Data: ${s.date}` : '',
      s.subject ? `Assunto: ${s.subject}` : '',
      s.urn ? `URN: ${s.urn}` : '',
      s.description ? `Trecho/ementa: ${s.description.slice(0, 3000)}` : '',
      `URL: ${s.url}`,
    ].filter(Boolean).join('\n')).join('\n\n');

    const modeInstruction = mode === 'quiz'
      ? 'Depois da explicação, crie 3 questões AUTORAIS A-D, com gabarito e comentário, usando apenas as fontes fornecidas.'
      : mode === 'research'
        ? 'Faça uma síntese comparativa e destaque divergências, datas e hierarquia das fontes quando existirem.'
        : 'Explique para uma bacharel em Direito retomando os estudos para a OAB e finalize com 5 pontos que podem virar questão de prova.';

    const prompt = `Você é o Tutor Jurídico da Mentora OAB 49. A prova-alvo é a 1ª fase em 09/05/2027.\n\nREGRAS OBRIGATÓRIAS:\n- Responda SOMENTE com base nas fontes recuperadas abaixo.\n- Não invente artigo, súmula, tese, precedente, prazo, número de processo ou conteúdo normativo.\n- Cite as fontes no texto usando [1], [2], etc.\n- Se as fontes forem insuficientes ou conflitantes, diga isso claramente.\n- Diferencie legislação, jurisprudência e proposição legislativa. Projeto de lei não é lei vigente.\n- Não trate jurisprudência antiga como entendimento atual sem ressalva.\n- Seja didático, objetivo e orientado à 1ª fase da OAB.\n- ${modeInstruction}\n\nDisciplina informada: ${discipline || 'não informada'}\nPergunta: ${query}\n\nFONTES OFICIAIS/INSTITUCIONAIS RECUPERADAS VIA LEXML:\n${sourceText}`;

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'gemini_not_configured', sources }, { status: 503, headers: cors });
    }
    const model = Deno.env.get('GEMINI_MODEL') || 'gemini-3.7-flash';
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1800 },
      }),
      signal: AbortSignal.timeout(45000),
    });

    if (!geminiRes.ok) {
      const detail = await geminiRes.text();
      console.error('Gemini error', geminiRes.status, detail.slice(0, 1000));
      return Response.json({ error: 'ai_provider_error', sources }, { status: 502, headers: cors });
    }

    const geminiJson = await geminiRes.json();
    const answer = geminiJson?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || '').join('\n').trim();
    if (!answer) throw new Error('Gemini returned empty answer');

    await supabase.from('ai_interactions').insert({
      user_id: userData.user.id,
      query,
      mode,
      discipline: discipline || null,
      response_text: answer,
      sources,
      model,
    });

    return Response.json({ status: 'ok', answer, sources, model }, {
      headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'internal_error', message: 'Não foi possível concluir a pesquisa jurídica.' }, {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
