import { pipeline, RawImage } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0";

const MODEL_ID = "Xenova/segformer-b0-finetuned-ade-512-512";
const GROUND_LABELS = new Set([
  "floor", "rug", "earth", "grass", "road", "sidewalk", "field", "sand"
]);

let segmenter = null;
let loading = null;

async function loadSegmenter(){
  if(segmenter) return segmenter;
  if(!loading){
    loading = pipeline("image-segmentation", MODEL_ID, {
      device:"wasm",
      dtype:"q8"
    }).then(model => {
      segmenter = model;
      self.postMessage({ type:"ready" });
      return model;
    }).catch(error => {
      loading = null;
      throw error;
    });
  }
  return loading;
}

function unionGroundMasks(outputs){
  const selected = outputs.filter(output => GROUND_LABELS.has(String(output.label).trim().toLowerCase()));
  if(!selected.length) return null;
  const { width, height } = selected[0].mask;
  const ground = new Uint8Array(width*height);
  for(const { mask } of selected){
    if(mask.width !== width || mask.height !== height) continue;
    const channels = mask.channels || Math.max(1, Math.round(mask.data.length/(width*height)));
    for(let i=0;i<ground.length;i++){
      if(mask.data[i*channels] > 0) ground[i] = 1;
    }
  }
  return { ground, width, height };
}

self.onmessage = async event => {
  const message = event.data || {};
  if(message.type === "load"){
    try{ await loadSegmenter(); }
    catch(error){ self.postMessage({ type:"error", message:String(error?.message || error) }); }
    return;
  }
  if(message.type !== "segment") return;

  try{
    const model = await loadSegmenter();
    const pixels = new Uint8ClampedArray(message.pixels);
    const image = new RawImage(pixels, message.width, message.height, 4);
    const outputs = await model(image);
    const merged = unionGroundMasks(outputs);
    if(!merged){
      self.postMessage({ type:"mask", requestId:message.requestId, found:false });
      return;
    }
    self.postMessage({
      type:"mask",
      requestId:message.requestId,
      found:true,
      width:merged.width,
      height:merged.height,
      mask:merged.ground.buffer
    }, [merged.ground.buffer]);
  }catch(error){
    self.postMessage({
      type:"segment-error",
      requestId:message.requestId,
      message:String(error?.message || error)
    });
  }
};
