// 녹기전에 염리점 — 같이 보기 방 (shared by the Cloudflare Durable Object and the local Node test server)
// The room is a relay with a little bookkeeping: who is here (numbered 손님 1, 2, …), who is the host (the first to arrive;
// the next in line takes over when the host leaves). The host runs the shop simulation and streams staff + queue state.
export class Room {
  constructor(send, close){ this.send=send; this.close=close; this.players=new Map(); this.nextNo=1; this.host=null; this.order=[]; this.snap=null; }
  join(id, look){
    const no=this.nextNo++; const p={id,no,name:'손님 '+no,look,x:0,z:5.3,f:0,st:'free',t:Date.now()}; this.players.set(id,p); this.order.push(id);
    if(!this.host) this.host=id;
    this.send(id,{t:'welcome',id,no,name:p.name,host:this.host,players:[...this.players.values()].map(q=>this.pub(q)),snap:this.host===id?null:this.snap});
    this.bcast({t:'join',p:this.pub(p)},id);
  }
  pub(p){ return {id:p.id,no:p.no,name:p.name,look:p.look,x:p.x,z:p.z,f:p.f,st:p.st}; }
  leave(id){
    if(!this.players.has(id)) return; this.players.delete(id); this.order=this.order.filter(x=>x!==id);
    this.bcast({t:'leave',id});
    if(this.host===id){ this.host=this.order[0]||null; this.snap=null; if(this.host) this.bcast({t:'host',id:this.host}); }
  }
  onMessage(id, m){
    const p=this.players.get(id); if(!p) return;
    switch(m.t){
      case 'p':   // my position (free movement): x,z,f(ace), a(nim flags)
        p.x=m.x; p.z=m.z; p.f=m.f; this.bcast({t:'p',id,x:m.x,z:m.z,f:m.f,a:m.a},id); break;
      case 'req': // a request for the host (order, sit, stand, bin, leave, tap)
        if(this.host&&this.host!==id) this.send(this.host,{t:'req',id,k:m.k,d:m.d}); break;
      case 'st':  // host: a player's state changed (and maybe where the sim put them)
        if(id!==this.host) return; const q=this.players.get(m.id); if(q){ q.st=m.st; } this.bcast({t:'st',id:m.id,st:m.st,d:m.d},id); break;
      case 'hp':  // host: positions of players the sim is moving (array of [id,x,z,f,a])
        if(id!==this.host) return; this.bcast({t:'hp',l:m.l},id); break;
      case 'staff': // host: staff puppets + queue order
        if(id!==this.host) return; this.snap=m; this.bcast(m,id); break;
      case 'say': // chat bubble / emote
        this.bcast({t:'say',id,s:String(m.s||'').slice(0,60)},id); break;
      case 'ping': this.send(id,{t:'pong',n:this.players.size}); break;
    }
  }
  bcast(m, except){ const s=JSON.stringify(m); for(const id of this.players.keys()){ if(id!==except) this.send(id,s); } }
}
