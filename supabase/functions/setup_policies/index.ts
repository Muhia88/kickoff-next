
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as postgres from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const databaseUrl = Deno.env.get("DATABASE_URL")!;
const pool = new postgres.Pool(databaseUrl, 3, true);

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const connection = await pool.connect();
        try {
            await connection.queryObject`ALTER TABLE IF EXISTS categories ENABLE ROW LEVEL SECURITY`;
            await connection.queryObject`DROP POLICY IF EXISTS "Public Read Categories" ON categories`;
            await connection.queryObject`CREATE POLICY "Public Read Categories" ON categories FOR SELECT USING (true)`;

            await connection.queryObject`ALTER TABLE IF EXISTS brands ENABLE ROW LEVEL SECURITY`;
            await connection.queryObject`DROP POLICY IF EXISTS "Public Read Brands" ON brands`;
            await connection.queryObject`CREATE POLICY "Public Read Brands" ON brands FOR SELECT USING (true)`;

            await connection.queryObject`ALTER TABLE IF EXISTS products ENABLE ROW LEVEL SECURITY`;
            await connection.queryObject`DROP POLICY IF EXISTS "Public Read Products" ON products`;
            await connection.queryObject`CREATE POLICY "Public Read Products" ON products FOR SELECT USING (true)`;

            await connection.queryObject`ALTER TABLE IF EXISTS events ENABLE ROW LEVEL SECURITY`;
            await connection.queryObject`DROP POLICY IF EXISTS "Public Read Events" ON events`;
            await connection.queryObject`CREATE POLICY "Public Read Events" ON events FOR SELECT USING (true)`;

            await connection.queryObject`ALTER TABLE IF EXISTS merchandise ENABLE ROW LEVEL SECURITY`;
            await connection.queryObject`DROP POLICY IF EXISTS "Public Read Merchandise" ON merchandise`;
            await connection.queryObject`CREATE POLICY "Public Read Merchandise" ON merchandise FOR SELECT USING (true)`;

            // Explicit Grants (Just to be sure)
            await connection.queryObject`GRANT SELECT ON categories TO anon, authenticated, service_role`;
            await connection.queryObject`GRANT SELECT ON brands TO anon, authenticated, service_role`;
            await connection.queryObject`GRANT SELECT ON products TO anon, authenticated, service_role`;
            await connection.queryObject`GRANT SELECT ON events TO anon, authenticated, service_role`;
            await connection.queryObject`GRANT SELECT ON merchandise TO anon, authenticated, service_role`;

            return new Response(JSON.stringify({ message: "Policies and Grants applied successfully" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        } finally {
            connection.release();
        }
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
});
