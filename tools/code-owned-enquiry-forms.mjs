import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
export async function loadCodeOwnedEnquiryForms(root=process.cwd()) {
 const bytes=await readFile(path.join(root,'tools/content/enquiry-forms.json'));
 const value=JSON.parse(bytes);
 if(value.site!=='ktk'||value.environment!=='staging'||value.forms.length!==7||new Set(value.forms.map(f=>f.id)).size!==7)throw Error('Exact seven-form manifest required');
 const deployed=path.join(root,'staging/wp-content/mu-plugins/ktk-code-pages-assets/enquiry-forms.json');
 await writeFile(deployed,bytes);
 return value;
}
// Self-contained DOM transform: used both by the complete generator and offline contract tests.
export function reviseCodeOwnedEnquiryForms({key,definition}) {
 const forms=[...document.querySelectorAll('form[data-ktk-form]')];
 if(!definition){if(forms.length)throw Error('Unregistered enquiry form: '+key);return [];}
 if(forms.length!==1)throw Error('Exactly one captured form required for '+key);
 const form=forms[0];
 for(const field of definition.fields){
  const controls=[...form.elements].filter(e=>e.name===field.name);
  if(!controls.length)throw Error('Missing original field '+field.id);
  if(field.type==='multiselect'){
   const choices=controls[0].type==='hidden'?[...controls[0].closest('.et_pb_contact_field').querySelectorAll('input[type="checkbox"]')]:controls;
   if(JSON.stringify(choices.map(e=>e.value))!==JSON.stringify(field.options))throw Error('Activity options drift: '+field.id);
   if(controls[0].type==='hidden')controls[0].value='[]';
  }else{
   if(controls.length!==1)throw Error('Unexpected duplicate scalar field');
   controls[0].required=field.required;
   if(field.maxLength!==undefined&&Number(controls[0].getAttribute('maxlength'))!==field.maxLength)throw Error('Original maxlength differs');
  }
 }
 form.querySelectorAll('input[name^="_wpcf7"],input[name="_ktk_request_id"]').forEach(e=>e.remove());
 form.dataset.ktkForm='contact';form.dataset.formIndex='0';form.dataset.routeKey=key;form.dataset.ktkOwnedEnquiry='true';
 delete form.dataset.feedbackEndpoint;
 form.action='__KTK_CONTACT_ACTION__';form.method='post';form.removeAttribute('novalidate');
 const hidden={action:'ktk_pages_contact',route_key:key,form_index:'0',_ktk_nonce:'__KTK_FORM_NONCE_0__',_ktk_challenge:'__KTK_FORM_CHALLENGE_0__',_ktk_request_id:'__KTK_FORM_REQUEST_ID_0__'};
 for(const[name,value]of Object.entries(hidden)){
  let input=[...form.elements].find(e=>e.name===name);
  if(!input){input=document.createElement('input');input.type='hidden';input.name=name;form.append(input);}
  input.value=value;
 }
 form.closest('[data-wpcf7-id]')?.removeAttribute('data-wpcf7-id');
 return [{index:0,fields:definition.fields,captcha:definition.arithmetic}];
}
