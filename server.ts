import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database("pos.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT,
    pin TEXT
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    sku TEXT UNIQUE,
    price REAL,
    cost REAL,
    stock INTEGER,
    category_id INTEGER,
    image_url TEXT,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    total REAL,
    tax REAL,
    discount REAL,
    payment_method TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    price REAL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
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
    order_id INTEGER,
    type TEXT, -- customer, merchant, kitchen, refund, gift_card
    status TEXT, -- printed, digital_only
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id)
  );

  CREATE TABLE IF NOT EXISTS receipt_taxes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_id TEXT,
    tax_name TEXT,
    rate REAL,
    amount REAL,
    FOREIGN KEY (receipt_id) REFERENCES receipts(id)
  );

  CREATE TABLE IF NOT EXISTS print_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_id TEXT,
    user_id INTEGER,
    print_type TEXT,
    status TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (receipt_id) REFERENCES receipts(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Seed initial receipt settings
const settingsCount = db.prepare("SELECT count(*) as count FROM receipt_settings").get() as { count: number };
if (settingsCount.count === 0) {
  db.prepare(`
    INSERT INTO receipt_settings (
      id, business_name, branch_name, address, phone, tax_id, footer_message, return_policy
    ) VALUES (1, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    "CloudPOS Coffee Co.",
    "Downtown Branch",
    "123 Innovation Way, Tech City",
    "+1 (555) 000-1234",
    "VAT-987654321",
    "Thank you for your business!",
    "Returns accepted within 30 days with receipt."
  );
}

// Seed initial data if empty
const userCount = db.prepare("SELECT count(*) as count FROM users").get() as { count: number };
if (userCount.count === 0) {
  db.prepare("INSERT INTO users (username, password, role, pin) VALUES (?, ?, ?, ?)").run("admin", "admin", "owner", "1234");
  db.prepare("INSERT INTO categories (name) VALUES (?)").run("Beverages");
  db.prepare("INSERT INTO categories (name) VALUES (?)").run("Food");
  db.prepare("INSERT INTO categories (name) VALUES (?)").run("Merchandise");
  
  const beveragesId = (db.prepare("SELECT id FROM categories WHERE name = ?").get("Beverages") as any).id;
  db.prepare("INSERT INTO products (name, sku, price, cost, stock, category_id) VALUES (?, ?, ?, ?, ?, ?)").run("Espresso", "COF-001", 3000, 500, 100, beveragesId);
  db.prepare("INSERT INTO products (name, sku, price, cost, stock, category_id) VALUES (?, ?, ?, ?, ?, ?)").run("Latte", "COF-002", 4500, 800, 100, beveragesId);
  db.prepare("INSERT INTO products (name, sku, price, cost, stock, category_id) VALUES (?, ?, ?, ?, ?, ?)").run("Cappuccino", "COF-003", 4250, 750, 100, beveragesId);
  db.prepare("INSERT INTO products (name, sku, price, cost, stock, category_id) VALUES (?, ?, ?, ?, ?, ?)").run("Croissant", "FOD-001", 3750, 1200, 50, (db.prepare("SELECT id FROM categories WHERE name = ?").get("Food") as any).id);
  db.prepare("INSERT INTO products (name, sku, price, cost, stock, category_id) VALUES (?, ?, ?, ?, ?, ?)").run("Muffin", "FOD-002", 3250, 900, 40, (db.prepare("SELECT id FROM categories WHERE name = ?").get("Food") as any).id);
  db.prepare("INSERT INTO products (name, sku, price, cost, stock, category_id) VALUES (?, ?, ?, ?, ?, ?)").run("CloudPOS Tee", "MER-001", 25000, 10000, 20, (db.prepare("SELECT id FROM categories WHERE name = ?").get("Merchandise") as any).id);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

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
    try {
      const result = db.prepare("INSERT INTO products (name, sku, price, cost, stock, category_id) VALUES (?, ?, ?, ?, ?, ?)").run(name, sku, price, cost, stock, category_id);
      res.json({ id: result.lastInsertRowid });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put("/api/products/:id", (req, res) => {
    const { name, sku, price, cost, stock, category_id } = req.body;
    try {
      db.prepare(`
        UPDATE products SET 
          name = ?, sku = ?, price = ?, cost = ?, stock = ?, category_id = ?
        WHERE id = ?
      `).run(name, sku, price, cost, stock, category_id, req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete("/api/products/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get("/api/categories", (req, res) => {
    const categories = db.prepare("SELECT * FROM categories").all();
    res.json(categories);
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
      SELECT r.*, o.total, o.tax, o.discount, o.payment_method, u.username as cashier_name
      FROM receipts r
      JOIN orders o ON r.order_id = o.id
      JOIN users u ON o.user_id = u.id
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

  // Update order creation to generate receipt
  app.post("/api/orders", (req, res) => {
    const { total, tax, discount, payment_method, items, user_id } = req.body;
    const receiptId = crypto.randomUUID();
    
    const transaction = db.transaction(() => {
      const orderResult = db.prepare("INSERT INTO orders (total, tax, discount, payment_method, user_id) VALUES (?, ?, ?, ?, ?)").run(total, tax, discount, payment_method, user_id);
      const orderId = orderResult.lastInsertRowid;

      for (const item of items) {
        db.prepare("INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)").run(orderId, item.id, item.quantity, item.price);
        db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?").run(item.quantity, item.id);
      }

      // Create Customer Receipt
      db.prepare("INSERT INTO receipts (id, order_id, type, status) VALUES (?, ?, ?, ?)").run(receiptId, orderId, 'customer', 'digital_only');
      
      // Add Tax breakdown (simple example)
      db.prepare("INSERT INTO receipt_taxes (receipt_id, tax_name, rate, amount) VALUES (?, ?, ?, ?)").run(receiptId, 'VAT', 10, tax);

      return receiptId;
    });

    try {
      const id = transaction();
      res.json({ id });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get("/api/reports/daily", (req, res) => {
    const sales = db.prepare(`
      SELECT date(created_at) as date, sum(total) as revenue, count(*) as orders
      FROM orders
      GROUP BY date(created_at)
      ORDER BY date DESC
      LIMIT 7
    `).all();
    res.json(sales);
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
