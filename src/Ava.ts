export class Ava {
  state: DurableObjectState;
  env: any;
  cache: Cache;
  argyle: DurableObjectStub;
  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
    this.state.blockConcurrencyWhile(async () => {
      this.cache = await caches.open("colo-kv-cache");
      this.argyle = this.env.Argyle.get(this.env.Argyle.idFromName("ArgyleMain"));
    });
  }
  async fetch(req: Request) {
    const {method, type, key, value, prefix, cacheTtl} = await req.json();
    switch(method) {
      case "get":
        const cached = await this.cache.match(key);
        if(cached) return new Response(cached);
        const argyleStore = await this.argyle.fetch("", {body:{method: "get", key}});
        if(!argyleStore) return new Response(null, {status: 404});
        cache(key, argyleStore, cacheTtl);
        return argyleStore;
      case "put":
        if(!key || typeof key !== "string") return new Response("Key must be a string.", {status: 400});
        if(!value) return new Response("Value must be set", {status: 404});
        if(!type) return new Response("Type must be set.", {status: 404});
        this.state.blockConcurrencyWhile(async () => {
          await this.argyle.fetch("", {body:{method, type, key, value}});
          cache(key, new Response(value));
        });
        return new Response("OK");
      case "delete":
        this.state.waitUntil(this.cache.delete(key));
        await this.argyle.fetch({method, key});
        return new Response("OK");
      case "list":
        return this.argyle.fetch("", {body:{method, prefix}});
      default:
        return new Response("Invalid Method", {status: 405});
    }
  }
}

function cache(key: string, res: Response, cacheTtl?: Number) {
  const cacheClone = res.clone();
  cacheClone.headers.set("Cloudflare-CDN-Cache-Control", "max-age=" + (cacheTtl || 60));
  this.state.waitUntil(this.cache.put(key, cacheClone));
}