import {readFile} from 'node:fs/promises';

export function offerTime(value){
 if(typeof value!=='string'||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value))throw Error('Explicit valid Warsaw local time required');
 const [hour,minute]=value.split(':').map(Number);
 return (hour%12||12)+(minute?':'+String(minute).padStart(2,'0'):'')+(hour>=12?' PM':' AM');
}

export function validateOfferFacts(data){
 const keys=(value,expected)=>{if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!==expected.split(',').sort().join(','))throw Error('Explicit reviewed offer-fact fields required');};
 keys(data,'schemaVersion,reviewedOn,operator,regular,nye,evidence');
 keys(data.operator,'name,since');keys(data.regular,'productId,slug,startTime,openBarMinutes,minimumAge,idAdvice,repeatVisit,venueCount,meeting');
 keys(data.regular.repeatVisit,'cashProof,onlineProof,onlineDiscountDelivery,amount');
 keys(data.regular.venueCount,'minimum,maximum');keys(data.regular.meeting,'name,shortName,place,lookFor');keys(data.nye,'productId,slug,date,startTimes,meetingStatus');
 if(data.schemaVersion!==1||data.reviewedOn!=='2026-11-13'||data.operator.name!=='Krawl Through Krakow'||data.operator.since!==2008
  ||data.regular.productId!==28||data.regular.slug!=='pub-crawl-28'||data.regular.startTime!=='21:00'||data.regular.openBarMinutes!==60
  ||data.regular.minimumAge!==18||data.regular.idAdvice!=='bring-valid-id'
  ||data.regular.repeatVisit.cashProof!=='participation-confirmed-with-leader'||data.regular.repeatVisit.onlineProof!=='previous-booking-confirmation-to-leader'||data.regular.repeatVisit.onlineDiscountDelivery!=='leader-code-or-previous-day-whatsapp-group'||data.regular.repeatVisit.amount!=='not-specified'
  ||data.regular.venueCount.minimum!==4||data.regular.venueCount.maximum!==5
  ||data.nye.productId!==32||data.nye.slug!=='nye-pub-crawl-32'||data.nye.date!=='2026-12-31'||data.nye.meetingStatus!=='to-be-announced'
  ||JSON.stringify(data.nye.startTimes)!==JSON.stringify(['17:00','19:30']))throw Error('Confirmed offer identity/facts changed; review the policy before rebuilding');
 for(const value of Object.values(data.regular.meeting))if(typeof value!=='string'||!value.trim()||value!==value.trim()||/[<>\u0000-\u001f]/.test(value))throw Error('Plain reviewed meeting facts required');
 if(!Array.isArray(data.evidence)||!data.evidence.length||data.evidence.some(value=>typeof value!=='string'||!value.trim()||/[<>\u0000-\u001f]/.test(value)))throw Error('Offer evidence required');
 return data;
}

export async function loadOfferFacts(){return validateOfferFacts(JSON.parse(await readFile(new URL('./site-offer-facts.json',import.meta.url),'utf8')));}

export function offerTemplateValues(data){
 validateOfferFacts(data);
 return {brand:data.operator.name,since:String(data.operator.since),regularTime:offerTime(data.regular.startTime),openBarHours:String(data.regular.openBarMinutes/60),venueRange:data.regular.venueCount.minimum+'-'+data.regular.venueCount.maximum,
  minimumAge:String(data.regular.minimumAge),meetingName:data.regular.meeting.name,meetingShort:data.regular.meeting.shortName,meetingPlace:data.regular.meeting.place,lookFor:data.regular.meeting.lookFor,nyeEarly:offerTime(data.nye.startTimes[0]),nyeLate:offerTime(data.nye.startTimes[1])};
}
