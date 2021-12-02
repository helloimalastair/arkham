export class Argyle {
  state: DurableObjectState;
  storage: DurableObjectStorage;
  keyCache: Array;
  env: any;
  enc: TextEncoder;
  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.storage = this.state.storage;
    this.env = env;
    this.enc = new TextEncoder();
    this.state.blockConcurrencyWhile(async () => this.keyCache = await this.storage.get("keyCache"));
  }
  async fetch(req: Request) {
    const {method, type, key, value, prefix} = await req.json();
    switch(method) {
      case "get":
        if(!key || typeof key !== "string") return new Response("Key must be a string.", {status: 400});
        else return new Response(await this.storage.get(key) || null);
      case "put":
        this.state.blockConcurrencyWhile(async () => {
          if(type === "string") await this.storage.put(value);
          else if(type === "ArrayBuffer") await this.storage.put(enc.encode(value));
          await keyAdd(key);
        });
        return new Response("OK");
      case "delete":
        if(!key || typeof key !== "string") return new Response("Key must be a string.", {status: 400});
        if(this.keyCache.indexOf(key) !== -1) this.state.blockConcurrencyWhile(async () => {
          await this.storage.delete(key);
          this.keyCache.filter(e => e !== key);
          await this.storage.put("keyCache". this.keyCache);
        });
        return new Response("OK");
      case "list":
        if(prefix) return new Response(this.keyCache.filter((e: string) => e.startsWith(prefix)));
        return new Response(this.keyCache);
      default:
        return new Response("Invalid Method", {status: 405});
    }
  }
}

async function keyAdd(key: string) {
  if(this.keyCache.indexOf(key) !== -1) return;
  this.keyCache.push(key);
  await this.storage.put("keyCache", this.keyCache);
}

