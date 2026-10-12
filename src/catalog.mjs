export const PLANS = Object.freeze({
  starter: {name:'Starter', cents:1900, credits:400, kind:'monthly'},
  creator: {name:'Creator', cents:3900, credits:900, kind:'monthly'},
  studio: {name:'Studio', cents:7900, credits:2000, kind:'monthly'},
  pack100: {name:'100 credits', cents:990, credits:100, kind:'one-time', days:30},
  pack200: {name:'200 credits', cents:1490, credits:200, kind:'one-time', days:30},
  pack500: {name:'500 credits', cents:2990, credits:500, kind:'one-time', days:90},
});
export const COSTS = Object.freeze({'480':50, '720':100, '1080':200});
export const FORMATS = ['Auto','16:9','1:1','9:16'];
export function cents(value) {
  if (typeof value !== 'string' || !/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction=''] = value.split('.');
  const result = Number(whole)*100 + Number(fraction.padEnd(2,'0'));
  return Number.isSafeInteger(result) ? result : null;
}
