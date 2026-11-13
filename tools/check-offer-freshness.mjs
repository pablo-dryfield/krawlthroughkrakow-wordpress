import {loadOfferFacts,offerCampaignReviewStatus} from './site-offer-facts.mjs';

const args=process.argv.slice(2);
if(args.length>1||(args.length&&!/^(?:\d{4}-\d{2}-\d{2})T(?:\d{2}:){2}\d{2}(?:Z|[+-]\d{2}:\d{2})$/.test(args[0])))throw Error('Use no argument or one explicit ISO instant with timezone');
const result=offerCampaignReviewStatus(await loadOfferFacts(),args.length?new Date(args[0]):new Date());
console.log(JSON.stringify({...result,note:'Editorial review only; does not change campaigns, prices, availability or bookings.'},null,2));
if(result.state==='review-required')process.exitCode=2;
