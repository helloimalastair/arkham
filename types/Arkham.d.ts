interface ArkhamGetOptions {
  cacheTtl?: number;
  type: "text" | "json" | "ArrayBuffer" | "ReadableStream";
};
type ArkhamPutTypes = string | ArrayBuffer | ArrayBufferView | ReadableStream;