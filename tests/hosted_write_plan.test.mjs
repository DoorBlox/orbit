import test from 'node:test';
import assert from 'node:assert/strict';
import { makeHostedWritePlan, confirmedOwner, developmentApi } from '../scripts/hosted-write-plan.mjs';
const nonowner='22222222-2222-4222-8222-222222222222';

test('offline mutation plan targets only disposable nonowner keys and never an owner workspace RPC',()=>{
  const plan=makeHostedWritePlan({nonownerId:nonowner,runId:'m3-synthetic-12345678'});
  assert.equal(plan.status,'PREPARED_NOT_EXECUTED');
  assert.equal(plan.mutationAuthorizationRequired,true);assert.equal(plan.usesOwnerRows,false);
  assert.equal(plan.fixtures.length,7);
  for(const f of plan.fixtures){
    assert.equal(f.fixture[f.table==='profiles'?'user_id':'owner_id'],nonowner);
    for(const probe of [f.insertProbe,f.updateProbe,f.deleteProbe]){
      assert.equal(new URL(probe.url).origin,developmentApi);
      assert.ok(!probe.url.includes('/rpc/'));assert.ok(!JSON.stringify(probe).includes(confirmedOwner));
    }
    for(const probe of [f.updateProbe,f.deleteProbe]){
      const q=new URL(probe.url).searchParams;
      assert.equal(q.get(f.table==='profiles'?'user_id':'owner_id'),`eq.${nonowner}`);
      assert.ok(q.has(f.primaryKey));
    }
  }
  const branch=plan.fixtures.find(f=>f.table==='branches').fixture;
  assert.equal(plan.fixtures.find(f=>f.table==='tasks').fixture.project_id,branch.id);
  assert.ok(!JSON.stringify(plan).includes('access_token'));
});

test('mutation preparation refuses owner, invalid IDs, unsafe run names and unreviewed targets',()=>{
  for(const nonownerId of [undefined,'not-a-uuid',confirmedOwner,confirmedOwner.toUpperCase()])
    assert.throws(()=>makeHostedWritePlan({nonownerId}),/nonowner/);
  assert.throws(()=>makeHostedWritePlan({nonownerId:nonowner,runId:'unbounded&owner_id=eq.owner'}),/identifier/);
  assert.throws(()=>makeHostedWritePlan({nonownerId:nonowner,apiOrigin:'https://production.example.test'}),/shared project/);
});


test('administrator fixture plan requires baseline-verified atomic cleanup without owner mutations',()=>{
  const plan=makeHostedWritePlan({nonownerId:nonowner,runId:'m3-synthetic-87654321'});
  const {seedSql,baselineSql,cleanupSql}=plan.administrator;
  for(const sql of [seedSql,cleanupSql]){
    assert.ok(sql.startsWith('begin;'));assert.ok(sql.endsWith('commit;'));
    assert.ok(sql.includes("auth.uid() is not null"));
    assert.ok(!/truncate|cascade|disable trigger|on conflict|delete from auth/i.test(sql));
  }
  assert.equal((baselineSql.match(/baseline_hash/g)||[]).length,7);
  assert.ok(cleanupSql.includes("current_setting('orbit_m3.fixture_baselines',true)"));
  assert.ok(cleanupSql.indexOf('delete from public.tasks')<cleanupSql.indexOf('delete from public.branches'));
  for(const f of plan.fixtures){
    assert.ok(seedSql.includes(`Fixture count precondition: ${f.table}`));
    assert.ok(cleanupSql.includes(`Missing or changed fixture baseline: ${f.table}`));
    assert.ok(cleanupSql.includes(`${f.primaryKey}='${f.fixture[f.primaryKey]}'`));
  }
});
