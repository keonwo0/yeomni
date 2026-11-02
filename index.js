import { Room } from './room.js';
export default {
  async fetch(req, env){
    const url=new URL(req.url);
    if(url.pathname.startsWith('/room/')){ const name=(url.pathname.slice(6)||'main').slice(0,40); const id=env.ROOM.idFromName(name); return env.ROOM.get(id).fetch(req); }
    return env.ASSETS.fetch(req);
  }
};
export class RoomDO {
  constructor(state, env){ this.state=state; this.socks=new Map();
    this.room=new Room((id,m)=>{ const ws=this.socks.get(id); if(!ws) return; try{ ws.send(typeof m==='string'?m:JSON.stringify(m)); }catch(e){} },
                       id=>{ const ws=this.socks.get(id); if(ws){ try{ ws.close(); }catch(e){} } }); }
  async fetch(req){
    if(req.headers.get('Upgrade')!=='websocket') return new Response(JSON.stringify({players:this.room.players.size,host:this.room.host}),{headers:{'content-type':'application/json','access-control-allow-origin':'*'}});
    const pair=new WebSocketPair(); const [client,server]=Object.values(pair);
    const id=crypto.randomUUID().slice(0,8); server.accept(); this.socks.set(id,server);
    server.addEventListener('message',ev=>{ let m; try{ m=JSON.parse(ev.data); }catch(e){ return; } this.room.onMessage(id,m); });
    const bye=()=>{ if(!this.socks.has(id)) return; this.socks.delete(id); this.room.leave(id); };
    server.addEventListener('close',bye); server.addEventListener('error',bye);
    const url=new URL(req.url); let look=null; try{ look=JSON.parse(url.searchParams.get('look')||'null'); }catch(e){}
    this.room.join(id, look);
    return new Response(null,{status:101,webSocket:client});
  }
}
