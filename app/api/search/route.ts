import { runRAGPipeline } from "../lib/rag";

export async function POST(req: Request) {
  const { query } = await req.json();
  const answer = await runRAGPipeline(query);
  return Response.json({ answer });
}
