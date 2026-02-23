import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import dotenv from "dotenv";
import Database from "better-sqlite3";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database("pos.db");

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'staff',
    pin TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    cost REAL NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    total REAL NOT NULL DEFAULT 0,
    tax REAL NOT NULL DEFAULT 0,
    discount REAL NOT NULL DEFAULT 0,
    payment_method TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    price REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS receipt_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    business_name TEXT,
    branch_name TEXT,
    address TEXT,
    phone TEXT,
    tax_id TEXT,
    logo_url TEXT,
    footer_message TEXT,
    return_policy TEXT,
    show_tax INTEGER DEFAULT 1,
    show_cashier INTEGER DEFAULT 1,
    show_sku INTEGER DEFAULT 1,
    font_size TEXT DEFAULT 'medium'
  );

  CREATE TABLE IF NOT EXISTS receipts (
    id TEXT PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    type TEXT,
    status TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS receipt_taxes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_id TEXT REFERENCES receipts(id) ON DELETE CASCADE,
    tax_name TEXT NOT NULL,
    rate REAL NOT NULL,
    amount REAL NOT NULL
  );

  -- Seed Data
  INSERT OR IGNORE INTO users (username, password, role, pin) VALUES ('admin', 'password', 'owner', '1234');
  INSERT OR IGNORE INTO categories (name) VALUES ('Beverages'), ('Food'), ('Merchandise');
  INSERT OR IGNORE INTO receipt_settings (id, business_name, branch_name, address, phone, tax_id, footer_message, return_policy)
  VALUES (1, 'CloudPOS Coffee Co.', 'Downtown Branch', '123 Innovation Way, Tech City', '+1 (555) 000-1234', 'VAT-987654321', 'Thank you for your business!', 'Returns accepted within 30 days with receipt.');
`);

const app = express();
app.use(express.json());

// API Routes
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password) as any;

  if (user) {
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

app.get("/api/products", (req, res) => {
  const products = db.prepare(`
    SELECT p.*, c.name as category_name 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id
  `).all();
  res.json(products);
});

app.post("/api/products", (req, res) => {
  const { name, sku, price, cost, stock, category_id } = req.body;
  const result = db.prepare("INSERT INTO products (name, sku, price, cost, stock, category_id) VALUES (?, ?, ?, ?, ?, ?)")
    .run(name, sku, price, cost, stock, category_id);
  const product = db.prepare("SELECT * FROM products WHERE id = ?").get(result.lastInsertRowid);
  res.json(product);
});

app.put("/api/products/:id", (req, res) => {
  const { name, sku, price, cost, stock, category_id } = req.body;
  db.prepare("UPDATE products SET name = ?, sku = ?, price = ?, cost = ?, stock = ?, category_id = ? WHERE id = ?")
    .run(name, sku, price, cost, stock, category_id, req.params.id);
  res.json({ success: true });
});

app.delete("/api/products/:id", (req, res) => {
  db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

app.get("/api/categories", (req, res) => {
  const categories = db.prepare("SELECT * FROM categories").all();
  res.json(categories);
});

app.post("/api/categories", (req, res) => {
  const { name } = req.body;
  const result = db.prepare("INSERT INTO categories (name) VALUES (?)").run(name);
  const category = db.prepare("SELECT * FROM categories WHERE id = ?").get(result.lastInsertRowid);
  res.json(category);
});

app.put("/api/categories/:id", (req, res) => {
  const { name } = req.body;
  db.prepare("UPDATE categories SET name = ? WHERE id = ?").run(name, req.params.id);
  res.json({ success: true });
});

app.delete("/api/categories/:id", (req, res) => {
  db.prepare("DELETE FROM categories WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

app.get("/api/receipt-settings", (req, res) => {
  const settings = db.prepare("SELECT * FROM receipt_settings WHERE id = 1").get();
  res.json(settings);
});

app.post("/api/receipt-settings", (req, res) => {
  const { business_name, branch_name, address, phone, tax_id, footer_message, return_policy, show_tax, show_cashier, show_sku, font_size } = req.body;
  db.prepare(`
    UPDATE receipt_settings SET 
    business_name = ?, branch_name = ?, address = ?, phone = ?, tax_id = ?, 
    footer_message = ?, return_policy = ?, show_tax = ?, show_cashier = ?, 
    show_sku = ?, font_size = ? 
    WHERE id = 1
  `).run(business_name, branch_name, address, phone, tax_id, footer_message, return_policy, show_tax, show_cashier, show_sku, font_size);
  res.json({ success: true });
});

app.get("/api/receipts/list", (req, res) => {
  const receipts = db.prepare(`
    SELECT r.*, o.total, o.created_at as order_date
    FROM receipts r
    JOIN orders o ON r.order_id = o.id
    ORDER BY r.created_at DESC
    LIMIT 50
  `).all();
  res.json(receipts);
});

app.get("/api/receipts/:id", (req, res) => {
  const receipt = db.prepare(`
    SELECT r.*, o.total, o.tax, o.discount, o.payment_method, o.user_id, u.username as cashier_name
    FROM receipts r
    JOIN orders o ON r.order_id = o.id
    LEFT JOIN users u ON o.user_id = u.id
    WHERE r.id = ?
  `).get(req.params.id) as any;

  if (!receipt) return res.status(404).json({ error: "Receipt not found" });

  const items = db.prepare(`
    SELECT oi.*, p.name, p.sku
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?
  `).all(receipt.order_id);

  const taxes = db.prepare("SELECT * FROM receipt_taxes WHERE receipt_id = ?").all(receipt.id);

  res.json({ ...receipt, items, taxes });
});

app.post("/api/orders", (req, res) => {
  const { total, tax, discount, payment_method, items, user_id } = req.body;
  
  const transaction = db.transaction(() => {
    const orderResult = db.prepare("INSERT INTO orders (total, tax, discount, payment_method, user_id) VALUES (?, ?, ?, ?, ?)")
      .run(total, tax, discount, payment_method, user_id);
    const orderId = orderResult.lastInsertRowid;

    for (const item of items) {
      db.prepare("INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)")
        .run(orderId, item.id, item.quantity, item.price);
      
      const product = db.prepare("SELECT stock FROM products WHERE id = ?").get(item.id) as any;
      if (!product || product.stock < item.quantity) {
        throw new Error(`Insufficient stock for product ID ${item.id}`);
      }
      db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?").run(item.quantity, item.id);
    }

    const receiptId = crypto.randomUUID();
    db.prepare("INSERT INTO receipts (id, order_id, type, status) VALUES (?, ?, ?, ?)")
      .run(receiptId, orderId, 'customer', 'digital_only');

    db.prepare("INSERT INTO receipt_taxes (receipt_id, tax_name, rate, amount) VALUES (?, ?, ?, ?)")
      .run(receiptId, 'VAT', 10, tax);

    return receiptId;
  });

  try {
    const receiptId = transaction();
    res.json({ id: receiptId });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/reports/stats", (req, res) => {
  const orders = db.prepare("SELECT total FROM orders").all() as any[];
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
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
});

app.get("/api/reports/daily", (req, res) => {
  const sales = db.prepare("SELECT date(created_at) as date, SUM(total) as revenue, COUNT(*) as orders FROM orders GROUP BY date(created_at) ORDER BY date DESC LIMIT 7").all();
  res.json(sales);
});

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.join(__dirname, "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
