// your-nextjs-project/app/api/chat/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/utils/supabase/client"; // Import your Supabase client

// Define the type for incoming chat pairs
interface InboundChatPair {
  user: string;
  assistant: string;
}

// POST handler to receive chat data from the extension
export async function POST(req: Request) {
  // Allow only POST requests (Next.js automatically handles OPTIONS for CORS)
  if (req.method !== 'POST') {
    return NextResponse.json({ message: `Method ${req.method} Not Allowed` }, { status: 405 });
  }

  try {
    const body: InboundChatPair[] = await req.json(); // Expecting an array of chat pairs
    console.log("📥 Received chat data:", body);

    // Basic validation
    if (!Array.isArray(body) || body.length === 0) {
      return NextResponse.json({ error: 'Invalid data format. Expected an array of chat pairs.' }, { status: 400 });
    }

    // Map the incoming data structure to your Supabase table's column names
    // Make sure 'user_message' and 'assistant_message' match your Supabase table columns
    const dataToInsert = body.map(pair => ({
      user: pair.user,
      assistant: pair.assistant
    }));

    // Insert the data into your Supabase 'chat_pairs' table
    const { data, error } = await supabase
      .from('chat-pairs') // Replace 'chat_pairs' with your actual table name if different
      .insert(dataToInsert);

    if (error) {
      console.error("🚨 Supabase insert error:", error);
      return NextResponse.json({ error: 'Failed to save data to Supabase', details: error.message }, { status: 500 });
    }

    console.log("✅ Data successfully inserted into Supabase:", data);
    return NextResponse.json({ success: true, insertedData: data }, { status: 200 });

  } catch (error: any) {
    console.error("❌ Error processing POST request:", error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

// GET handler to retrieve initial chat data for the frontend
export async function GET() {
  try {
    // Fetch all chat pairs, ordered by creation time, limited to 50 for performance
    const { data, error } = await supabase
      .from('chat-pairs') // Replace 'chat_pairs' with your actual table name if different
      .select('*') // Select all columns

    if (error) {
      console.error("🚨 Supabase fetch error (GET):", error);
      return NextResponse.json({ error: 'Failed to retrieve chat data', details: error.message }, { status: 500 });
    }

    // Map the data from Supabase format to your desired ChatPair interface
    const chatPairs = data.map(row => ({
      user: row.user,
      assistant: row.assistant
    }));

    console.log("Serving chat data from Supabase for GET request.");
    return NextResponse.json({ chatPairs }, { status: 200 });

  } catch (error: any) {
    console.error("❌ Error processing GET request:", error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

// OPTIONS handler for CORS preflight requests (Next.js usually handles this automatically for route handlers)
// You might not strictly need this if Next.js's default CORS handling is sufficient.
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}