import type { Instrumentation } from "next";
export async function register(){
 if(process.env.NEXT_RUNTIME === "nodejs" && process.env.OBSERVABILITY_ENABLED === "1"){
  const {applicationStarted}=await import("./lib/observability");applicationStarted();
 }
}
export const onRequestError:Instrumentation.onRequestError=async(_error,request)=>{
 if(process.env.NEXT_RUNTIME === "nodejs" && process.env.OBSERVABILITY_ENABLED === "1"){
  const {requestError}=await import("./lib/observability");requestError(request.method,request.path);
 }
};
