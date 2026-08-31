import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { requireSession } from "../../../../../lib/auth";
import { scheduleReview } from "../../../../../lib/scheduler";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{await requireSession();const {id}=await params;const {confidence}=await request.json();if(!["KNEW_IT","FORGOT","NO_IDEA"].includes(confidence))return NextResponse.json({error:"Invalid confidence"},{status:400});const score=await db.score.findUnique({where:{wordId:id}});if(!score)return NextResponse.json({error:"Word not found"},{status:404});const updated=await db.score.update({where:{wordId:id},data:scheduleReview(score,confidence)});return NextResponse.json({score:updated})}catch(error){return NextResponse.json({error:error instanceof Error&&error.message==="UNAUTHORIZED"?"Unauthorized":"Unable to save confidence"},{status:error instanceof Error&&error.message==="UNAUTHORIZED"?401:500})}}
