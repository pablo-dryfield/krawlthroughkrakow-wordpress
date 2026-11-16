"""Exact ordinary HTML comparison with only Cloudflare email encoding compared by decoded payload.

Raw bytes/hashes remain evidence. This never changes served HTML, settings, forms or selected-state guards.
"""
from __future__ import annotations
import hashlib,re
from html.parser import HTMLParser

SCOPE='exact-html-with-cloudflare-email-payload-hashes'

def decoded_payload(value):
    if not isinstance(value,str) or len(value)<4 or len(value)>4096 or len(value)%2 or re.fullmatch(r'[a-fA-F0-9]+',value) is None:raise ValueError('Exact bounded Cloudflare email hex required')
    raw=bytes.fromhex(value);plain=bytes(x^raw[0] for x in raw[1:]);text=plain.decode('utf-8')
    if '@' not in text or any(ord(c)<32 or ord(c)==127 for c in text):raise ValueError('Observed email encoding must decode to printable UTF-8 payload')
    # The published Cloudflare decoder subsequently applies deterministic attribute
    # parsing. Equal pre-parsing payloads conservatively require equal inputs to it.
    return plain

class EmailFields(HTMLParser):
    def __init__(self,text):
        super().__init__(convert_charrefs=False);self.text=text;self.offsets=[0];self.replacements=[];self.fields=[];self.blocked=[]
        for m in re.finditer('\n',text):self.offsets.append(m.end())
    def handle_starttag(self,tag,attrs):
        if tag in ('script','noscript','textarea','xmp','head'):self.blocked.append(tag);return
        if self.blocked:return
        values=dict(attrs);choices=[]
        if tag=='a' and values.get('href','').startswith('/cdn-cgi/l/email-protection#'):choices.append(('href',values['href'],values['href'].split('#',1)[1],'/cdn-cgi/l/email-protection#'))
        if tag=='span' and 'data-cfemail' in values and '__cf_email__' in values.get('class','').split():choices.append(('data-cfemail',values['data-cfemail'],values['data-cfemail'],''))
        if not choices:return
        if len(values)!=len(attrs):raise ValueError('Ambiguous email-protection attributes refused')
        raw=self.get_starttag_text();line,col=self.getpos();start=self.offsets[line-1]+col
        for name,value,code,prefix in choices:
            plain=decoded_payload(code);digest=hashlib.sha256(plain).hexdigest()
            pattern=re.compile(r'(?<![\w:-])'+re.escape(name)+r'\s*=\s*([\x22\x27])([^\x22\x27]*)\1',re.I);matches=[m for m in pattern.finditer(raw) if m[2]==value]
            if len(matches)!=1:raise ValueError('Exact literal email-protection attribute required')
            m=matches[0];a=start+m.start(2)+len(prefix);b=start+m.end(2)
            if self.text[a:b]!=code:raise ValueError('Email-protection source offset differs')
            self.replacements.append((a,b,'CF_EMAIL_PAYLOAD_SHA256_'+digest));self.fields.append({'tag':tag,'attribute':name,'decodedPayloadSha256':digest,'decodedPayloadBytes':len(plain)})
    def handle_startendtag(self,tag,attrs):self.handle_starttag(tag,attrs);self.handle_endtag(tag)
    def handle_endtag(self,tag):
        if tag in self.blocked:
            index=len(self.blocked)-1-self.blocked[::-1].index(tag);self.blocked=self.blocked[:index]

def projection(raw):
    if not isinstance(raw,bytes) or len(raw)>4194304:raise ValueError('Bounded ordinary HTML bytes required')
    text=raw.decode('utf-8');parser=EmailFields(text);parser.feed(text);parser.close();last=-1
    for a,b,_ in parser.replacements:
        if not 0<=a<b<=len(text) or a<last:raise ValueError('Overlapping email-protection fields refused')
        last=b
    normalized=text
    for a,b,value in reversed(parser.replacements):normalized=normalized[:a]+value+normalized[b:]
    data=normalized.encode('utf-8');return {'scope':SCOPE,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'emailFields':parser.fields}

def equivalent(a,b):
    for r in (a,b):
        p=r.get('projection') if isinstance(r,dict) else None
        if not isinstance(p,dict) or set(p)!={'scope','bytes','sha256','emailFields'} or p['scope']!=SCOPE or type(p['bytes']) is not int or p['bytes']<0 or not isinstance(p['sha256'],str) or re.fullmatch(r'[a-f0-9]{64}',p['sha256']) is None or not isinstance(p['emailFields'],list):raise ValueError('Explicit ordinary-response projection required; no raw identity claim')
    return all(a.get(k)==b.get(k) for k in ('status','method','mime','projection'))
