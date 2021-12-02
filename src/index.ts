export default class Arkham {
  ava: DurableObjectStub;
  dec: TextDecoder;
  constructor(colo: string, env: any) {
    this.ava = env.Ava.get(env.Ava.idFromName(colo));
    this.enc = new TextEncoder();
    this.dec = new TextDecoder();
  }
  async get(key: string, options?: ArkhamGetOptions) {
    const avaResponse = await this.ava.fetch("", {body: {method:"get",key,cacheTtl:options.cacheTtl}});
    switch(options.type) {
      default:
      case "string":
        return await avaResponse.text();
      case "json":
        try {
          return await avaResponse.json();
        } catch(e) {
          console.error("Issue while attempting to parse value as JSON");
        }
      case "ArrayBuffer":
        return await avaResponse.arrayBuffer();
      case "ReadableStream":
        const {readable, writeable} = new TransformStream();
        writable.getWriter().write(await avaResponse.arrayBuffer());
        return readable;
    }
  }
  async put(key: string, value: ArkhamPutTypes) {
    switch(typeof value) {
      case string:
        await this.ava.fetch("", {body:{method:"put",key,value,type:"string"}});
        break;
      case ArrayBuffer:
      case ArrayBufferView:
        await this.ava.fetch("", {body:{method:"put",key,value:this.dec.decode(value),type:"ArrayBuffer"}});
        break;
      case ReadableStream:
        value = await new Response(value).arrayBuffer();
        await this.ava.fetch("", {body:{method:"put",key,value:this.dec.decode(value),type:"ArrayBuffer"}});
        break;
      default:
        throw new Error("Invalid Input Type in KV");
    }
  }
  async delete(key: string) {
    await this.ava.fetch("",{body:{method:"delete",key}});
  }
  async list(prefix?: string) {
    return await this.ava("",{body:{method:"list",prefix}});
  }
}

export {Argyle} from "./Argyle";
export {Ava} from "./Ava";