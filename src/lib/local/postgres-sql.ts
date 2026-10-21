/** SQL interno y estático. Los valores del usuario siempre se parametrizan. */
export function postgresSql(input:string){
 let text=input.replace(/\browid\b/g,"_seq"),index=0,result="",quote="";
 const ignore=/^INSERT OR IGNORE /i.test(text);if(ignore)text=text.replace(/^INSERT OR IGNORE /i,"INSERT ");
 for(let n=0;n<text.length;n++){
  const char=text[n];
  if(quote){result+=char;if(char===quote){if(text[n+1]===quote){result+=text[++n];}else quote="";}}
  else if(char==="'"||char==='"'){quote=char;result+=char;}
  else result+=char==="?"?`$${++index}`:char;
 }
 if(ignore)result=result.replace(/;?\s*$/," ON CONFLICT DO NOTHING");
 return result;
}
export function safeInteger(value:string){const number=Number(value);if(!Number.isSafeInteger(number))throw new Error("Entero PostgreSQL fuera del rango seguro");return number;}
