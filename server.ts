import express from "express";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize Supabase
let supabaseUrl = (process.env.VITE_SUPABASE_URL || "").trim();
if (supabaseUrl.endsWith("/")) {
  supabaseUrl = supabaseUrl.slice(0, -1);
}
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "").trim();

if (!supabaseUrl) {
  console.error("CRITICAL: VITE_SUPABASE_URL is not defined in environment variables.");
}
if (!supabaseKey) {
  console.error("CRITICAL: Supabase Key (Service Role or Anon) is not defined.");
}

// Use a single client for server-side operations. 
// If it's the SERVICE_ROLE_KEY, it will bypass RLS.
let supabase: any;
try {
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    console.log("Supabase client initialized successfully.");
  } else {
    console.warn("Supabase client NOT initialized due to missing configuration.");
  }
} catch (err) {
  console.error("Failed to initialize Supabase client:", err);
}

const app = express();
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Check Supabase initialization
const apiRouter = express.Router();

apiRouter.use((req, res, next) => {
  console.log(`API Request: ${req.method} ${req.url}`);
  if (!supabase && req.path !== "/debug/status") {
    console.warn(`Supabase not initialized, blocking request to ${req.url}`);
    return res.status(503).json({ 
      error: "Supabase client is not initialized. Please check your environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)." 
    });
  }
  next();
});

// API Test
apiRouter.get("/test", (req, res) => {
  res.json({ message: "API is working" });
});

// Auth
apiRouter.get("/debug/status", (req, res) => {
  res.json({
    supabaseUrl: !!process.env.VITE_SUPABASE_URL,
    supabaseAnonKey: !!process.env.VITE_SUPABASE_ANON_KEY,
    supabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    nodeEnv: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000,
    appUrl: !!process.env.APP_URL
  });
});

apiRouter.get("/auth/google/url", async (req, res) => {
  try {
    const appUrl = process.env.APP_URL || `http://localhost:3000`;
    const redirectUri = `${appUrl}/api/auth/callback`;
    
    console.log(`Generating Google Auth URL with redirect: ${redirectUri}`);
    
    // Use the anon key for OAuth if possible, as it's a public operation
    const anonKey = (process.env.VITE_SUPABASE_ANON_KEY || "").trim();
    const authClient = (anonKey && supabaseUrl) ? createClient(supabaseUrl, anonKey) : supabase;

    const { data, error } = await authClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: true
      }
    });

    if (error) {
      console.error("Supabase OAuth Error:", error);
      throw error;
    }
    
    if (!data || !data.url) {
      throw new Error("No URL returned from Supabase OAuth");
    }

    res.json({ url: data.url });
  } catch (err: any) {
    console.error("Google Auth URL error:", err);
    res.status(500).json({ error: err.message || "Failed to generate Google Auth URL" });
  }
});

apiRouter.get("/auth/callback", async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).send("No code provided");
  }

  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(String(code));
    
    if (error) throw error;

    // Fetch or ensure profile exists
    let { data: profile } = await supabase
      .from("users")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (!profile) {
      const { data: newProfile } = await supabase
        .from("users")
        .insert([{ id: data.user.id, username: data.user.email, role: 'owner' }])
        .select()
        .single();
      profile = newProfile;
    }

    const responseUser = {
      ...data.user,
      ...(profile || {}),
      username: profile?.username || data.user.email,
      id: data.user.id
    };

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'OAUTH_AUTH_SUCCESS',
                user: ${JSON.stringify(responseUser)}
              }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (err: any) {
    console.error("Auth callback error:", err);
    res.status(500).send(`Authentication failed: ${err.message}`);
  }
});

apiRouter.post("/auth/signup", async (req, res) => {
  const { username, password } = req.body;
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: username,
      password: password,
    });

    if (authError) return res.status(400).json({ error: authError.message });

    if (authData.user) {
      const isConfirmationRequired = authData.session === null;
      if (isConfirmationRequired) {
        return res.json({ 
          message: "Signup successful! Please check your email to confirm your account.",
          confirmationRequired: true 
        });
      }

      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", authData.user.id)
        .single();

      res.json({
        ...authData.user,
        ...(profile || {}),
        username: username,
        role: profile?.role || 'staff',
        id: authData.user.id
      });
    } else {
      res.status(400).json({ error: "Signup failed" });
    }
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

apiRouter.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: username,
      password: password,
    });

    if (authError) return res.status(401).json({ error: authError.message });

    if (authData.user) {
      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", authData.user.id)
        .single();

      res.json({
        ...authData.user,
        ...(profile || {}),
        username: profile?.username || authData.user.email,
        id: authData.user.id
      });
    } else {
      res.status(401).json({ error: "Authentication failed" });
    }
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Products
apiRouter.get("/products", async (req, res) => {
  const { data: products, error } = await supabase
    .from("products")
    .select(`*, categories (name)`);
  
  if (error) return res.status(400).json({ error: error.message });
  res.json(products.map(p => ({ ...p, category_name: p.categories?.name })));
});

apiRouter.post("/products", async (req, res) => {
  const { name, sku, price, cost, stock, category_id } = req.body;
  const { data, error } = await supabase
    .from("products")
    .insert([{ name, sku, price, cost, stock, category_id }])
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

apiRouter.put("/products/:id", async (req, res) => {
  const { name, sku, price, cost, stock, category_id } = req.body;
  const { data, error } = await supabase
    .from("products")
    .update({ name, sku, price, cost, stock, category_id })
    .eq("id", req.params.id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true, data });
});

apiRouter.delete("/products/:id", async (req, res) => {
  const { error } = await supabase.from("products").delete().eq("id", req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// Categories
apiRouter.get("/categories", async (req, res) => {
  const { data, error } = await supabase.from("categories").select("*");
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

apiRouter.post("/categories", async (req, res) => {
  const { name } = req.body;
  const { data, error } = await supabase.from("categories").insert([{ name }]).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

apiRouter.put("/categories/:id", async (req, res) => {
  const { name } = req.body;
  const { data, error } = await supabase.from("categories").update({ name }).eq("id", req.params.id).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true, data });
});

apiRouter.delete("/categories/:id", async (req, res) => {
  const { error } = await supabase.from("categories").delete().eq("id", req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// Receipt Settings
apiRouter.get("/receipt-settings", async (req, res) => {
  const { data, error } = await supabase.from("receipt_settings").select("*").eq("id", 1).single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

apiRouter.post("/receipt-settings", async (req, res) => {
  const { business_name, branch_name, address, phone, tax_id, footer_message, return_policy, show_tax, show_cashier, show_sku, font_size } = req.body;
  const { error } = await supabase.from("receipt_settings").update({ 
    business_name, branch_name, address, phone, tax_id, footer_message, return_policy, show_tax, show_cashier, show_sku, font_size 
  }).eq("id", 1);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// Receipts
apiRouter.get("/receipts/list", async (req, res) => {
  const { data, error } = await supabase.from("receipts").select(`*, orders (total, created_at)`).order("created_at", { ascending: false }).limit(50);
  if (error) return res.status(400).json({ error: error.message });
  res.json(data.map(r => ({ ...r, total: r.orders?.total, order_date: r.orders?.created_at })));
});

apiRouter.get("/receipts/:id", async (req, res) => {
  const { data: receipt, error } = await supabase.from("receipts").select(`*, orders (*, users (username))`).eq("id", req.params.id).single();
  if (error || !receipt) return res.status(404).json({ error: "Receipt not found" });
  
  const { data: items } = await supabase.from("order_items").select(`*, products (name, sku)`).eq("order_id", receipt.order_id);
  res.json({ 
    ...receipt, 
    total: receipt.orders?.total,
    discount: receipt.orders?.discount,
    payment_method: receipt.orders?.payment_method,
    cashier_name: receipt.orders?.users?.username,
    items: items?.map(i => ({ ...i, name: i.products?.name, sku: i.products?.sku })),
    taxes: [] 
  });
});

// Orders
apiRouter.post("/orders", async (req, res) => {
  const { total, discount, payment_method, items, user_id } = req.body;
  try {
    const { data: receiptId, error } = await supabase.rpc('place_order', {
      p_total: total, p_tax: 0, p_discount: discount, p_payment_method: payment_method, p_user_id: user_id,
      p_items: items.map((item: any) => ({ id: item.id, quantity: item.quantity, price: item.price }))
    });
    if (error) throw error;
    res.json({ id: receiptId });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Reports
apiRouter.get("/reports/stats", async (req, res) => {
  try {
    const { data: orders, error } = await supabase.from("orders").select("total, created_at");
    if (error) throw error;
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
    res.json({ totalRevenue, totalOrders: orders.length, avgOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0 });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get("/reports/daily", async (req, res) => {
  const { data: sales, error } = await supabase.from("orders").select("created_at, total");
  if (error) return res.status(400).json({ error: error.message });
  const grouped = sales.reduce((acc: any, curr: any) => {
    const date = new Date(curr.created_at).toISOString().split('T')[0];
    if (!acc[date]) acc[date] = { date, revenue: 0, orders: 0 };
    acc[date].revenue += curr.total;
    acc[date].orders += 1;
    return acc;
  }, {});
  res.json(Object.values(grouped).sort((a: any, b: any) => b.date.localeCompare(a.date)).slice(0, 7));
});

// Blog Routes
apiRouter.get("/blogs", async (req, res) => {
  const { data, error } = await supabase.from("blog_posts").select(`*, users (username)`).order("created_at", { ascending: false });
  if (error) return res.status(400).json({ error: error.message });
  res.json(data.map(post => ({ ...post, author_name: post.users?.username })));
});

apiRouter.post("/blogs", async (req, res) => {
  const { title, slug, content, excerpt, cover_image, author_id, status } = req.body;
  const { data, error } = await supabase.from("blog_posts").insert([{ title, slug, content, excerpt, cover_image, author_id, status }]).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

apiRouter.put("/blogs/:id", async (req, res) => {
  const { title, slug, content, excerpt, cover_image, status } = req.body;
  const { data, error } = await supabase.from("blog_posts").update({ title, slug, content, excerpt, cover_image, status, updated_at: new Date() }).eq("id", req.params.id).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

apiRouter.delete("/blogs/:id", async (req, res) => {
  const { error } = await supabase.from("blog_posts").delete().eq("id", req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// Site Settings & Pages
apiRouter.get("/site-settings", async (req, res) => {
  const { data, error } = await supabase.from("site_settings").select("*").eq("id", 1).single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

apiRouter.post("/site-settings", async (req, res) => {
  const { site_name, site_description, contact_email, social_links, theme_config } = req.body;
  const { error } = await supabase.from("site_settings").update({ site_name, site_description, contact_email, social_links, theme_config, updated_at: new Date() }).eq("id", 1);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

apiRouter.get("/pages", async (req, res) => {
  const { data, error } = await supabase.from("pages").select("*").order("created_at", { ascending: false });
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

apiRouter.post("/pages", async (req, res) => {
  const { title, slug, content, is_published } = req.body;
  const { data, error } = await supabase.from("pages").insert([{ title, slug, content, is_published }]).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// API Catch-all
apiRouter.all("*", (req, res) => {
  console.log(`API 404: ${req.method} ${req.url}`);
  res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
});

// Mount API Router
app.use("/api", apiRouter);

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  console.log("Starting in development mode with Vite middleware...");
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  console.log("Starting in production mode...");
  const distPath = path.join(__dirname, "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

const PORT = 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
