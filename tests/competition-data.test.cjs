const assert = require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs');const ts=require('typescript');
const code=ts.transpileModule(fs.readFileSync(require.resolve('../lib/competition-data.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const h={};new Function('exports',code)(h);
function snapshot(revision,status='live',wins=2){return {revision,season_year:2026,fetched_at:'2026-09-21T03:00:00Z',teams:{},games:[{id:'g',status}],records:{a:{team_id:'a',overall_ready:true,wins,losses:0}},rankings:{},standings:[]};}
test('final and new record replace one snapshot together',()=>{
 const old=h.acceptCompetitionSnapshot(undefined,snapshot(1));const next=h.acceptCompetitionSnapshot(old,snapshot(2,'final',3));
 assert.equal(next.snapshot.games[0].status,'final');assert.equal(h.currentTeamRecord(next.snapshot,'a',next.isCurrent).wins,3);
});
test('late response cannot replace a newer final/record or satisfy a known revision',()=>{
 const current=h.acceptCompetitionSnapshot(undefined,snapshot(2,'final',3));
 const late=h.acceptCompetitionSnapshot(current,snapshot(1));assert.equal(late.snapshot.revision,2);assert.equal(late.isCurrent,false);
 const waiting=h.acceptCompetitionSnapshot(current,snapshot(2),3);assert.equal(waiting.isCurrent,false);assert.equal(waiting.snapshot.records.a.wins,3);
 assert.equal(h.acceptCompetitionSnapshot(waiting,snapshot(3,'final',3),3).isCurrent,true);
});
test('unverified baseline, disconnect and cross-season responses cannot present records as current',()=>{
 const s=snapshot(1);assert.equal(h.currentTeamRecord(s,'a',false),undefined);s.records.a.overall_ready=false;assert.equal(h.currentTeamRecord(s,'a',true),undefined);
 const old=h.acceptCompetitionSnapshot(undefined,s);assert.throws(()=>h.acceptCompetitionSnapshot(old,{...snapshot(2),season_year:2025}));
 assert.throws(()=>h.acceptCompetitionSnapshot(old,{...snapshot(2),revision:NaN}));
});
test('badges resolve selected current poll independently of historical game ranks',()=>{
 const s=snapshot(1);s.games[0].home_team_ranking=1;s.rankings={ap:{entries:[{team_id:'a',rank:5}]},usa:{entries:[{team_id:'a',rank:7}]}};
 assert.equal(h.currentRank(s,'a','ap'),5);assert.equal(h.currentRank(s,'a','usa'),7);assert.equal(h.currentRank(s,'a','cfp'),null);
});
