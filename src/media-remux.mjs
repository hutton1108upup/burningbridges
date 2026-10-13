import {BufferSource,BufferTarget,EncodedAudioPacketSource,EncodedPacketSink,EncodedVideoPacketSource,Input,Mp4InputFormat,Mp4OutputFormat,Output} from 'mediabunny';

const MAX_VIDEO=24*1024*1024,MAX_AUDIO=8*1024*1024;
export async function remuxWithOriginalAudio(videoBytes,audioBytes,{maxVideoBytes=MAX_VIDEO,maxAudioBytes=MAX_AUDIO}={}){
  if(videoBytes.byteLength>maxVideoBytes||audioBytes.byteLength>maxAudioBytes)throw new Error('MEDIA_INPUT_TOO_LARGE');
  const videoInput=new Input({source:new BufferSource(videoBytes),formats:[new Mp4InputFormat()]}),audioInput=new Input({source:new BufferSource(audioBytes),formats:[new Mp4InputFormat()]});
  try{
    const videoTrack=(await videoInput.getTracks()).find(x=>x.type==='video'),audioTrack=(await audioInput.getTracks()).find(x=>x.type==='audio');
    if(!videoTrack||!audioTrack)throw new Error('MEDIA_TRACK_MISSING');
    const videoCodec=await videoTrack.getCodec(),audioCodec=await audioTrack.getCodec(),videoSource=new EncodedVideoPacketSource(videoCodec),audioSource=new EncodedAudioPacketSource(audioCodec),target=new BufferTarget(),output=new Output({format:new Mp4OutputFormat(),target});
    output.addVideoTrack(videoSource);output.addAudioTrack(audioSource);await output.start();
    const videoSink=new EncodedPacketSink(videoTrack),audioSink=new EncodedPacketSink(audioTrack),videoConfig=await videoTrack.getDecoderConfig(),audioConfig=await audioTrack.getDecoderConfig();
    for await(const packet of videoSink.packets()){await videoSource.add(packet,videoConfig?{decoderConfig:videoConfig}:undefined);}
    videoSource.close?.();
    for await(const packet of audioSink.packets()){await audioSource.add(packet,audioConfig?{decoderConfig:audioConfig}:undefined);}
    audioSource.close?.();
    await output.finalize();if(!target.buffer)throw new Error('MEDIA_OUTPUT_EMPTY');if(target.buffer.byteLength>MAX_VIDEO)throw new Error('MEDIA_OUTPUT_TOO_LARGE');return new Uint8Array(target.buffer);
  }finally{videoInput.dispose();audioInput.dispose();}
}
