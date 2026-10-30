/**
 * tests/test_p3_performance.js
 * Bateria de testes automatizados para a Fase P3 (API e Performance)
 *
 * Cobre:
 * 1. Paginação por cursor com cast seguro de ObjectId e critério de desempate
 * 2. Paginação híbrida (cursor e offset/page) no monitoramento
 * 3. Projeção enxuta de campos (corte de ~90% de payload) e flag ?full=true
 * 4. Eliminação de N+1 em GET /api/modules via agregação única
 * 5. Agregação com $facet em GET /api/modules/:moduleId/stats
 * 6. Invalidação imediata de cache de métricas em operações de escrita
 * 7. Limpeza de métricas em /api/server/status (exclusão de soft-deleted, active e provisioned counts)
 */

require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');

const BASE_URL = 'http://127.0.0.1:3000';

let passed = 0;
let failed = 0;

function assert(description, condition, details = '') {
  if (condition) {
    console.log(`  ✅ ${description} ${details ? '(' + details + ')' : ''}`);
    passed++;
  } else {
    console.error(`  ❌ ${description} ${details ? '— ' + details : ''}`);
    failed++;
  }
}

async function runP3Tests() {
  console.log('\n=================================================================');
  console.log('⚡  BATERIA DE TESTES P3 — API E PERFORMANCE');
  console.log('=================================================================\n');

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mdm');

  let adminToken = '';
  let authHeader = {};
  let moduleId = '';
  const testPrefix = `DEV-P3-${Date.now()}`;
  const ManagedAsset = require('../backend/models/ManagedAsset');

  // 0. Autenticação Admin e Criação de Módulo de Teste
  try {
    const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: process.env.ADMIN_PASSWORD || 'admin123',
    });
    adminToken = loginRes.data.token;
    authHeader = { Authorization: `Bearer ${adminToken}` };

    const modRes = await axios.post(`${BASE_URL}/api/modules`, {
      name: `Módulo Performance P3 ${Date.now()}`,
      type: 'desktop',
      description: 'Módulo para testes de performance e agregação P3',
    }, { headers: authHeader });
    moduleId = modRes.data.module._id;

    // Cria 6 ativos de teste para validar paginações e contagens
    for (let i = 1; i <= 6; i++) {
      await axios.post(`${BASE_URL}/api/modules/${moduleId}/assets`, {
        serial_number: `${testPrefix}-${i}`,
        asset_name: `Estacao-P3-${i}`,
        asset_type: 'desktop',
        installed_software: ['Chrome', 'Office 365', 'Slack', 'VSCode', 'Python 3.12', 'Docker Desktop'],
        ram: '16 GB',
        storage: '512 GB',
      }, { headers: authHeader });
    }
  } catch (err) {
    console.error('Falha no setup de autenticação/módulo:', err.response?.data?.message || err.message);
    process.exit(1);
  }

  // ── TESTE 1: Paginação por Cursor e Cast Seguro de ObjectId ────────
  console.log('1. Paginação por Cursor com Cast de ObjectId (B11):');
  try {
    // Busca primeira página de 3 itens
    const p1 = await axios.get(`${BASE_URL}/api/modules/${moduleId}/assets/cursor?limit=3`, {
      headers: authHeader,
    });

    assert('GET /assets/cursor responde 200 OK', p1.status === 200);
    assert('Primeira página retorna exatamente 3 itens', p1.data.data.length === 3);
    assert('hasMore é true', p1.data.pagination.hasMore === true);
    assert('nextCursor gerado em base64', Boolean(p1.data.pagination.nextCursor));

    const cursor1 = p1.data.pagination.nextCursor;

    // Busca segunda página usando o cursor
    const p2 = await axios.get(`${BASE_URL}/api/modules/${moduleId}/assets/cursor?limit=3&cursor=${cursor1}`, {
      headers: authHeader,
    });

    assert('Segunda página via cursor responde 200 OK sem erro de ObjectId', p2.status === 200);
    assert('Segunda página retorna exatamente 3 itens restantes', p2.data.data.length === 3);

    // Garante que não há duplicação entre página 1 e página 2
    const idsP1 = new Set(p1.data.data.map((a) => a._id));
    const overlap = p2.data.data.some((a) => idsP1.has(a._id));
    assert('Itens entre páginas por cursor são disjuntos (sem repetição)', !overlap);
  } catch (err) {
    assert('Paginação por cursor', false, err.response?.data?.message || err.message);
  }

  // ── TESTE 2: Paginação Híbrida no Monitoramento (/api/monitoring/assets)
  console.log('\n2. Paginação Híbrida no Monitoramento:');
  try {
    // Paginação por página/offset (usado pelo painel)
    const pageRes = await axios.get(`${BASE_URL}/api/monitoring/assets?page=1&limit=2`, {
      headers: authHeader,
    });

    assert('GET /api/monitoring/assets com page/limit responde 200 OK', pageRes.status === 200);
    assert('Retorna estrutura com pagination type "offset"', pageRes.data.pagination?.type === 'offset');
    assert('Limita resultado para 2 itens', pageRes.data.assets.length === 2);
    assert('pages e total presentes', pageRes.data.pagination.total > 0 && pageRes.data.pagination.pages >= 1);

    // Paginação por cursor no mesmo endpoint
    const cursorRes = await axios.get(`${BASE_URL}/api/monitoring/assets?cursor=&limit=3`, {
      headers: authHeader,
    });
    assert('GET /api/monitoring/assets com cursor responde com type "cursor"', cursorRes.data.pagination?.type === 'cursor');
  } catch (err) {
    assert('Paginação híbrida de monitoramento', false, err.response?.data?.message || err.message);
  }

  // ── TESTE 3: Projeção Enxuta de Campos (Redução de Banda - B3) ───────
  console.log('\n3. Projeção Enxuta de Campos (< 50 KB vs ~1 MB):');
  try {
    // Chamada normal (sem ?full=true): campos pesados devem ser omitidos
    const leanRes = await axios.get(`${BASE_URL}/api/monitoring/assets?limit=5`, {
      headers: authHeader,
    });

    const sampleAsset = leanRes.data.assets.find((a) => a.serial_number.startsWith(testPrefix));
    assert('Ativo retornado na listagem enxuta', Boolean(sampleAsset));
    assert('installed_software OMITIDO na listagem enxuta', sampleAsset && sampleAsset.installed_software === undefined);
    assert('Campos vitais PRESENTES (serial_number, status, health_status)', Boolean(sampleAsset?.serial_number && sampleAsset?.status && sampleAsset?.health_status));

    // Chamada com ?full=true: campos pesados devem vir
    const fullRes = await axios.get(`${BASE_URL}/api/monitoring/assets?limit=5&full=true`, {
      headers: authHeader,
    });
    const fullSample = fullRes.data.assets.find((a) => a.serial_number.startsWith(testPrefix));
    assert('installed_software PRESENTE quando ?full=true', Boolean(fullSample?.installed_software && fullSample.installed_software.length > 0));
  } catch (err) {
    assert('Projeção de campos', false, err.response?.data?.message || err.message);
  }

  // ── TESTE 4: Agregação sem N+1 em GET /api/modules (B8) ─────────────
  console.log('\n4. Eliminação de N+1 em GET /api/modules:');
  try {
    const modulesRes = await axios.get(`${BASE_URL}/api/modules`, {
      headers: authHeader,
    });

    assert('GET /api/modules responde 200 OK', modulesRes.status === 200);
    const targetModule = modulesRes.data.modules.find((m) => m._id === moduleId);
    assert('Módulo de teste presente na listagem', Boolean(targetModule));
    assert('asset_count agregado reflete exatamente os 6 ativos criados', targetModule?.asset_count === 6);
  } catch (err) {
    assert('Listagem de módulos sem N+1', false, err.response?.data?.message || err.message);
  }

  // ── TESTE 5: Agregação $facet e Invalidação de Cache no Stats (B8) ───
  console.log('\n5. Agregação $facet e Invalidação Ativa de Cache:');
  try {
    // 5.1 Primeira chamada: cálculo inicial do banco (fromCache: false)
    const stats1 = await axios.get(`${BASE_URL}/api/modules/${moduleId}/stats`, {
      headers: authHeader,
    });

    assert('GET /stats responde 200 OK', stats1.status === 200);
    assert('Stats computados (total: 6, online: 6)', stats1.data.total === 6 && stats1.data.online === 6);
    assert('Métricas de saúde inclusas (healthy: 6)', stats1.data.healthy === 6);
    assert('Primeira chamada computada via banco (fromCache: false)', stats1.data.fromCache === false);

    // 5.2 Segunda chamada imediata: deve vir do cache
    const stats2 = await axios.get(`${BASE_URL}/api/modules/${moduleId}/stats`, {
      headers: authHeader,
    });
    assert('Segunda chamada servida via cache (fromCache: true)', stats2.data.fromCache === true);

    // 5.3 Mutação de ativo: cria 7º ativo -> deve invalidar o cache
    await axios.post(`${BASE_URL}/api/modules/${moduleId}/assets`, {
      serial_number: `${testPrefix}-7`,
      asset_name: 'Estacao-P3-7',
      asset_type: 'desktop',
    }, { headers: authHeader });

    // 5.4 Terceira chamada: cache DEVE ter sido invalidado e retornar 7 ativos
    const stats3 = await axios.get(`${BASE_URL}/api/modules/${moduleId}/stats`, {
      headers: authHeader,
    });
    assert('Cache invalidado após novo ativo (fromCache: false)', stats3.data.fromCache === false);
    assert('Total atualizado para 7 ativos', stats3.data.total === 7);
  } catch (err) {
    assert('Agregação e cache de stats', false, err.response?.data?.message || err.message);
  }

  // ── TESTE 6: Métricas Transparentes em /api/server/status (B9) ──────
  console.log('\n6. Métricas do Servidor (/api/server/status):');
  try {
    const statusBefore = await axios.get(`${BASE_URL}/api/server/status`, {
      headers: authHeader,
    });

    const initialTotal = statusBefore.data.device_count;

    // Cria um ativo já marcado como deletado
    const deletedAsset = await ManagedAsset.create({
      module_id: moduleId,
      serial_number: `${testPrefix}-DELETED`,
      asset_name: 'Estacao-Excluida',
      asset_type: 'desktop',
      is_deleted: true,
      deleted_at: new Date(),
    });

    const statusAfter = await axios.get(`${BASE_URL}/api/server/status`, {
      headers: authHeader,
    });

    assert('device_count NÃO contabiliza ativos soft-deleted', statusAfter.data.device_count === initialTotal);
    assert('active_devices exposto numericamente', typeof statusAfter.data.active_devices === 'number');
    assert('provisioned_devices exposto numericamente (não exibe "--")', typeof statusAfter.data.provisioned_devices === 'number');
    assert('process_uptime exposto em segundos', typeof statusAfter.data.process_uptime === 'number' && statusAfter.data.process_uptime > 0);
    assert('host_uptime exposto em segundos', typeof statusAfter.data.host_uptime === 'number' && statusAfter.data.host_uptime > 0);

    // Remove ativo deletado do teste
    await ManagedAsset.findByIdAndDelete(deletedAsset._id);
  } catch (err) {
    assert('Métricas do servidor', false, err.response?.data?.message || err.message);
  }

  // ── Limpeza dos dados de teste ──────────────────────────────────────
  try {
    await ManagedAsset.deleteMany({ module_id: moduleId });
    if (moduleId) {
      await axios.delete(`${BASE_URL}/api/modules/${moduleId}`, { headers: authHeader });
    }
  } catch {
    // Limpeza silenciosa
  } finally {
    try {
      await mongoose.disconnect();
    } catch {}
  }

  console.log('\n=================================================================');
  console.log(`📊 RESULTADO P3: ${passed} PASSOU | ${failed} FALHOU`);
  console.log('=================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runP3Tests().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
