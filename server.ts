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
const supabase = createClient(supabaseUrl, supabaseKey);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .eq("password", password)
      .single();

    if (user) {
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

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
    
    // Flatten category name to match previous API structure
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

  app.get("/api/categories", async (req, res) => {
    const { data: categories, error } = await supabase
      .from("categories")
      .select("*");
    
    if (error) return res.status(400).json({ error: error.message });
    res.json(categories);
  });

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
      tax: receipt.orders?.tax,
      discount: receipt.orders?.discount,
      payment_method: receipt.orders?.payment_method,
      cashier_name: receipt.orders?.users?.username,
      items: flattenedItems, 
      taxes 
    });
  });

  app.post("/api/orders", async (req, res) => {
    const { total, tax, discount, payment_method, items, user_id } = req.body;
    
    try {
      // Start a "transaction" via RPC or multiple calls (Supabase doesn't have multi-table transactions in JS SDK easily without RPC)
      // For simplicity in this prototype, we'll do sequential calls.
      
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert([{ total, tax, discount, payment_method, user_id }])
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = items.map((item: any) => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Update stock
      for (const item of items) {
        const { error: stockError } = await supabase.rpc('decrement_stock', { 
          row_id: item.id, 
          amount: item.quantity 
        });
        // If RPC doesn't exist, we'd do a manual update, but RPC is safer for concurrency
        if (stockError) {
           // Fallback if RPC not defined
           await supabase
             .from("products")
             .update({ stock: item.stock - item.quantity })
             .eq("id", item.id);
        }
      }

      const receiptId = crypto.randomUUID();
      const { error: receiptError } = await supabase
        .from("receipts")
        .insert([{ id: receiptId, order_id: order.id, type: 'customer', status: 'digital_only' }]);

      if (receiptError) throw receiptError;

      const { error: taxError } = await supabase
        .from("receipt_taxes")
        .insert([{ receipt_id: receiptId, tax_name: 'VAT', rate: 10, amount: tax }]);

      if (taxError) throw taxError;

      res.json({ id: receiptId });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get("/api/reports/daily", async (req, res) => {
    // In Supabase/Postgres, we use date_trunc or casting
    const { data: sales, error } = await supabase
      .from("orders")
      .select("created_at, total");
    
    if (error) return res.status(400).json({ error: error.message });

    // Group by date in JS for simplicity or use a view/RPC
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
