import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl) {
  console.error("CRITICAL: VITE_SUPABASE_URL is not defined in environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
app.use(express.json());

// API Routes

// Auth
app.post("/api/auth/signup", async (req, res) => {
  const { username, password } = req.body; // username is email
  
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: username,
      password: password,
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    if (authData.user) {
      // Create profile data in our custom 'users' table
      const { error: profileError } = await supabase
        .from("users")
        .insert([{
          id: authData.user.id,
          username: username,
          role: 'staff' // Default role
        }]);

      if (profileError) {
        console.error("Profile creation error:", profileError);
        return res.status(400).json({ error: "User created but profile setup failed: " + profileError.message });
      }

      const responseUser = {
        ...authData.user,
        username: username,
        role: 'staff',
        id: authData.user.id
      };

      res.json(responseUser);
    } else {
      res.status(400).json({ error: "Signup failed" });
    }
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body; // username is email
  
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: username,
      password: password,
    });

    if (authError) {
      return res.status(401).json({ error: authError.message });
    }

    if (authData.user) {
      // Fetch profile data from our custom 'users' table
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("id", authData.user.id)
        .single();

      // If profile doesn't exist, we might want to create it or just return auth user
      // For this app, we expect the profile to exist or we return the auth user as fallback
      const responseUser = {
        ...authData.user,
        ...(profile || {}),
        username: profile?.username || authData.user.email,
        id: authData.user.id
      };

      res.json(responseUser);
    } else {
      res.status(401).json({ error: "Authentication failed" });
    }
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Products
app.get("/api/products", async (req, res) => {
  const { data: products, error } = await supabase
    .from("products")
    .select(`
      *,
      categories (
        name
      )
    `);
  
  if (error) return res.status(400).json({ error: error.message });
  
  const flattened = products.map(p => ({
    ...p,
    category_name: p.categories?.name
  }));
  
  res.json(flattened);
});

app.post("/api/products", async (req, res) => {
  const { name, sku, price, cost, stock, category_id } = req.body;
  const { data, error } = await supabase
    .from("products")
    .insert([{ name, sku, price, cost, stock, category_id }])
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

app.put("/api/products/:id", async (req, res) => {
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

app.delete("/api/products/:id", async (req, res) => {
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", req.params.id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// Categories
app.get("/api/categories", async (req, res) => {
  const { data: categories, error } = await supabase
    .from("categories")
    .select("*");
  
  if (error) return res.status(400).json({ error: error.message });
  res.json(categories);
});

app.post("/api/categories", async (req, res) => {
  const { name } = req.body;
  const { data, error } = await supabase
    .from("categories")
    .insert([{ name }])
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

app.put("/api/categories/:id", async (req, res) => {
  const { name } = req.body;
  const { data, error } = await supabase
    .from("categories")
    .update({ name })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true, data });
});

app.delete("/api/categories/:id", async (req, res) => {
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", req.params.id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// Receipt Settings
app.get("/api/receipt-settings", async (req, res) => {
  const { data: settings, error } = await supabase
    .from("receipt_settings")
    .select("*")
    .eq("id", 1)
    .single();
  
  if (error) return res.status(400).json({ error: error.message });
  res.json(settings);
});

app.post("/api/receipt-settings", async (req, res) => {
  const { business_name, branch_name, address, phone, tax_id, footer_message, return_policy, show_tax, show_cashier, show_sku, font_size } = req.body;
  const { error } = await supabase
    .from("receipt_settings")
    .update({ 
      business_name, branch_name, address, phone, tax_id, 
      footer_message, return_policy, show_tax, show_cashier, 
      show_sku, font_size 
    })
    .eq("id", 1);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// Receipts
app.get("/api/receipts/list", async (req, res) => {
  const { data: receipts, error } = await supabase
    .from("receipts")
    .select(`
      *,
      orders (
        total,
        created_at
      )
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return res.status(400).json({ error: error.message });
  
  const flattened = receipts.map(r => ({
    ...r,
    total: r.orders?.total,
    order_date: r.orders?.created_at
  }));
  
  res.json(flattened);
});

app.get("/api/receipts/:id", async (req, res) => {
  const { data: receipt, error } = await supabase
    .from("receipts")
    .select(`
      *,
      orders (
        total,
        tax,
        discount,
        payment_method,
        user_id,
        users (
          username
        )
      )
    `)
    .eq("id", req.params.id)
    .single();

  if (error || !receipt) return res.status(404).json({ error: "Receipt not found" });

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select(`
      *,
      products (
        name,
        sku
      )
    `)
    .eq("order_id", receipt.order_id);

  const { data: taxes, error: taxesError } = await supabase
    .from("receipt_taxes")
    .select("*")
    .eq("receipt_id", receipt.id);

  const flattenedItems = items?.map(i => ({
    ...i,
    name: i.products?.name,
    sku: i.products?.sku
  }));

  res.json({ 
    ...receipt, 
    total: receipt.orders?.total,
    discount: receipt.orders?.discount,
    payment_method: receipt.orders?.payment_method,
    cashier_name: receipt.orders?.users?.username,
    items: flattenedItems, 
    taxes: [] 
  });
});

// Orders
app.post("/api/orders", async (req, res) => {
  const { total, discount, payment_method, items, user_id } = req.body;
  
  try {
    const { data: receiptId, error } = await supabase.rpc('place_order', {
      p_total: total,
      p_tax: 0,
      p_discount: discount,
      p_payment_method: payment_method,
      p_user_id: user_id,
      p_items: items.map((item: any) => ({
        id: item.id,
        quantity: item.quantity,
        price: item.price
      }))
    });

    if (error) throw error;
    res.json({ id: receiptId });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Reports
app.get("/api/reports/stats", async (req, res) => {
  try {
    const { data: orders, error } = await supabase
      .from("orders")
      .select("total, created_at");

    if (error) throw error;

    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    res.json({
      totalRevenue,
      totalOrders,
      avgOrderValue,
      newCustomers: 0,
      revenueTrend: "+12.5%",
      ordersTrend: "+8.2%",
      customersTrend: "+5.1%",
      avgTrend: "-2.4%"
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/reports/daily", async (req, res) => {
  const { data: sales, error } = await supabase
    .from("orders")
    .select("created_at, total");
  
  if (error) return res.status(400).json({ error: error.message });

  const grouped = sales.reduce((acc: any, curr: any) => {
    const date = new Date(curr.created_at).toISOString().split('T')[0];
    if (!acc[date]) acc[date] = { date, revenue: 0, orders: 0 };
    acc[date].revenue += curr.total;
    acc[date].orders += 1;
    return acc;
  }, {});

  const result = Object.values(grouped)
    .sort((a: any, b: any) => b.date.localeCompare(a.date))
    .slice(0, 7);

  res.json(result);
});

// Blog Routes
app.get("/api/blogs", async (req, res) => {
  const { data, error } = await supabase
    .from("blog_posts")
    .select(`
      *,
      users (
        username
      )
    `)
    .order("created_at", { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  
  const flattened = data.map(post => ({
    ...post,
    author_name: post.users?.username
  }));
  
  res.json(flattened);
});

app.post("/api/blogs", async (req, res) => {
  const { title, slug, content, excerpt, cover_image, author_id, status } = req.body;
  const { data, error } = await supabase
    .from("blog_posts")
    .insert([{ title, slug, content, excerpt, cover_image, author_id, status }])
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

app.put("/api/blogs/:id", async (req, res) => {
  const { title, slug, content, excerpt, cover_image, status } = req.body;
  const { data, error } = await supabase
    .from("blog_posts")
    .update({ title, slug, content, excerpt, cover_image, status, updated_at: new Date() })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

app.delete("/api/blogs/:id", async (req, res) => {
  const { error } = await supabase
    .from("blog_posts")
    .delete()
    .eq("id", req.params.id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// Site Settings & Pages
app.get("/api/site-settings", async (req, res) => {
  const { data, error } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .single();
  
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

app.post("/api/site-settings", async (req, res) => {
  const { site_name, site_description, contact_email, social_links, theme_config } = req.body;
  const { error } = await supabase
    .from("site_settings")
    .update({ site_name, site_description, contact_email, social_links, theme_config, updated_at: new Date() })
    .eq("id", 1);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

app.get("/api/pages", async (req, res) => {
  const { data, error } = await supabase
    .from("pages")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

app.post("/api/pages", async (req, res) => {
  const { title, slug, content, is_published } = req.body;
  const { data, error } = await supabase
    .from("pages")
    .insert([{ title, slug, content, is_published }])
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

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

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
