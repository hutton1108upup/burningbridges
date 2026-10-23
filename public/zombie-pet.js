(() => {
  'use strict';
  const slots = [...document.querySelectorAll('[data-photo-slot]')];
  slots.forEach(slot => {
    const input=slot.querySelector('input');
    const image=slot.querySelector('img');
    const picker=slot.querySelector('.photo-pick');
    const controls=slot.querySelector('.photo-preview-control');
    const status=slot.querySelector('[role="status"]');
    let url=null,version=0;
    const clear=()=>{delete input.dataset.generationReady;version++;if(url)URL.revokeObjectURL(url);url=null;image.removeAttribute('src');image.hidden=true;picker.hidden=false;controls.hidden=true;input.value='';status.textContent='';};
    input.addEventListener('change',async()=>{
      const file=input.files?.[0];
      if(!file)return;
      delete input.dataset.generationReady;
      const request=++version;
      if(!['image/jpeg','image/png','image/webp'].includes(file.type)){status.textContent='Choose a JPG, PNG or WebP photo.';input.value='';return;}
      if(file.size>8*1024*1024){status.textContent='Choose a photo smaller than 8 MB.';input.value='';return;}
      const nextUrl=URL.createObjectURL(file);
      try {
        const probe=new Image();probe.src=nextUrl;await probe.decode();
        if(request!==version){URL.revokeObjectURL(nextUrl);return;}
        if(url)URL.revokeObjectURL(url);url=nextUrl;image.src=url;image.hidden=false;picker.hidden=true;controls.hidden=false;status.textContent='Photo added.';input.dataset.generationReady='true';
      }catch{URL.revokeObjectURL(nextUrl);if(request===version){status.textContent='This file could not be read. Choose another photo.';input.value='';}}
    });
    slot.querySelector('[data-replace]').addEventListener('click',()=>input.click());
    slot.querySelector('[data-remove]').addEventListener('click',clear);
    window.addEventListener('pagehide',event=>{if(!event.persisted){version++;if(url)URL.revokeObjectURL(url);}});
  });
})();
