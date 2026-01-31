const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const multer = require('multer');
const fs = require('fs');

const app = express();

// ============================================
// CONFIGURATION
// ============================================
const config = {
  clientId: '1467193651938459661',
  clientSecret: process.env.DISCORD_CLIENT_SECRET || 'mRRiOA2BGxRjMtc35XQLayeQWb9t7HOI',
  redirectUri: process.env.REDIRECT_URI || 'https://donutmc.store/auth/callback',
  jwtSecret: process.env.JWT_SECRET || 'corTKP6vZaGFibsQIbFWIFg30BxgjbIk5j9HCWRjyLYM4GYSb6PoaYEJyvWX7fLz',
  frontendUrl: process.env.FRONTEND_URL || 'https://donutmc.store',
  supabaseUrl: process.env.SUPABASE_URL || 'https://fvutlenecqsiapepehdu.supabase.co',
  supabaseKey: process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2dXRsZW5lY3FzaWFwZXBlaGR1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTg2NDA5MywiZXhwIjoyMDg1NDQwMDkzfQ.9naOMuJWCnFOFW9lEYevQBxvwV34BKMs19FwJ2FeYTc',
  discordWebhook: process.env.DISCORD_WEBHOOK || 'https://discord.com/api/webhooks/1467208987006079161/k7ERjC7utStX-g2vXTza2UyEeWNLmWvqOaUrxVqlD5cCraKw-15iPIkzwWOoAU0xh1AQ',
  adminIds: ['1226742807696506971']
};

const supabase = createClient(config.supabaseUrl, config.supabaseKey);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const upload = multer({ dest: 'schematics/' });
   const schematicMetaFile = path.join(__dirname, 'schematics.json');

   // Helper to load/save schematic metadata
   function loadSchematicMeta() {
     if (!fs.existsSync(schematicMetaFile)) return [];
     return JSON.parse(fs.readFileSync(schematicMetaFile, 'utf8'));
   }
   function saveSchematicMeta(meta) {
     fs.writeFileSync(schematicMetaFile, JSON.stringify(meta, null, 2));
   }

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateOrderId() {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `DMC-${timestamp}-${randomPart}`.toUpperCase();
}

async function sendDiscordNotification(order) {
  if (!config.discordWebhook || config.discordWebhook === 'YOUR_DISCORD_WEBHOOK_URL') return;

  const itemsList = order.items.map(item => 
    `• ${item.title} x${item.quantity} - $${item.price}`
  ).join('\n');

  const embed = {
    embeds: [{
      title: '🛒 New Order Received!',
      color: 0x6366f1,
      fields: [
        { name: 'Order ID', value: `\`${order.id}\``, inline: true },
        { name: 'Total', value: `**$${order.total}**`, inline: true },
        { name: 'Status', value: '🟡 Pending', inline: true },
        { name: 'Discord User', value: `${order.discord_global_name || order.discord_username} (<@${order.user_id}>)`, inline: false },
        { name: 'Minecraft Username', value: `\`${order.minecraft_username}\``, inline: true },
        { name: 'Items', value: itemsList || 'No items', inline: false }
      ],
      timestamp: new Date().toISOString(),
      footer: { text: 'DonutMC.Store' }
    }]
  };

  try {
    await fetch(config.discordWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(embed)
    });
  } catch (error) {
    console.error('Failed to send Discord notification:', error);
  }
}

async function sendStatusUpdateNotification(order, oldStatus, newStatus) {
  if (!config.discordWebhook || config.discordWebhook === 'YOUR_DISCORD_WEBHOOK_URL') return;

  const statusEmojis = { pending: '🟡', processing: '🔵', completed: '🟢', cancelled: '🔴' };

  const embed = {
    embeds: [{
      title: '📦 Order Status Updated',
      color: newStatus === 'completed' ? 0x22c55e : newStatus === 'cancelled' ? 0xef4444 : 0x3b82f6,
      fields: [
        { name: 'Order ID', value: `\`${order.id}\``, inline: true },
        { name: 'Status Change', value: `${statusEmojis[oldStatus]} ${oldStatus} → ${statusEmojis[newStatus]} ${newStatus}`, inline: true },
        { name: 'Customer', value: `<@${order.user_id}>`, inline: true },
        { name: 'Minecraft', value: `\`${order.minecraft_username}\``, inline: true }
      ],
      timestamp: new Date().toISOString(),
      footer: { text: 'DonutMC.Store' }
    }]
  };

  try {
    await fetch(config.discordWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(embed)
    });
  } catch (error) {
    console.error('Failed to send status update notification:', error);
  }
}

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireAdmin(req, res, next) {
  if (!config.adminIds.includes(req.user.id)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// ============================================
// DISCORD OAUTH2
// ============================================

app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.redirect(`${config.frontendUrl}?error=no_code`);

  try {
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: config.redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      console.error('Token error:', tokenData);
      return res.redirect(`${config.frontendUrl}?error=token_error`);
    }

    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userData = await userResponse.json();
    const isAdmin = config.adminIds.includes(userData.id);
    // Log login to Supabase
try {
  await supabase.from('login_logs').insert([{
    user_id: userData.id,
    username: userData.username,
    discriminator: userData.discriminator,
    global_name: userData.global_name,
    avatar: userData.avatar,
    email: userData.email,
    is_admin: isAdmin,
    ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress || null,
    user_agent: req.headers['user-agent'] || null,
    created_at: new Date().toISOString()
  }]);
} catch (logError) {
  console.error('Failed to log login:', logError);
}
    const token = jwt.sign({
      id: userData.id,
      username: userData.username,
      discriminator: userData.discriminator,
      avatar: userData.avatar,
      email: userData.email,
      globalName: userData.global_name,
      isAdmin: isAdmin
    }, config.jwtSecret, { expiresIn: '7d' });

    res.redirect(`${config.frontendUrl}?token=${token}`);
  } catch (error) {
    console.error('Auth error:', error);
    res.redirect(`${config.frontendUrl}?error=auth_failed`);
  }
});

app.get('/api/user', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    res.json({ user: decoded });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// ============================================
// PRODUCTS API (PUBLIC)
// ============================================

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (category) {
      query = query.eq('category', category);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to fetch products' });
    }
    
    // Transform for frontend compatibility
    const products = data.map(p => ({
      id: p.id,
      category: p.category,
      title: p.title,
      price: `$${parseFloat(p.price).toFixed(2)}`,
      priceNum: parseFloat(p.price),
      oldPrice: p.old_price ? `$${parseFloat(p.old_price).toFixed(2)}` : null,
      discount: p.discount,
      stock: p.stock,
      inStock: p.in_stock && p.stock > 0,
      emoji: p.image_url ? `<img src="${p.image_url}" alt="${p.title}" class="product-image">` : (p.emoji || '📦'),
      imageUrl: p.image_url,
      description: p.description
    }));
    
    res.json({ products });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get categories with counts
app.get('/api/categories', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('category');
    
    if (error) {
      return res.status(500).json({ error: 'Failed to fetch categories' });
    }
    
    // Count products per category
    const categoryCounts = {};
    data.forEach(p => {
      categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
    });
    
    // Define category display info
    const categoryInfo = {
      'Money': { icon: '💰', order: 1 },
      'Items': { icon: '📦', order: 2 },
      'Bases': { icon: '🏠', order: 3 }
    };
    
    const categories = Object.keys(categoryInfo).map(name => ({
      name,
      icon: categoryInfo[name].icon,
      count: categoryCounts[name] || 0,
      order: categoryInfo[name].order
    })).sort((a, b) => a.order - b.order);
    
    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// PRODUCTS API (ADMIN)
// ============================================

// Create product
app.post('/api/admin/products', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { category, title, price, oldPrice, discount, stock, imageUrl, description } = req.body;
    
    if (!category || !title || price === undefined) {
      return res.status(400).json({ error: 'Category, title, and price are required' });
    }
    
    const product = {
      category,
      title,
      price: parseFloat(price),
      old_price: oldPrice ? parseFloat(oldPrice) : null,
      discount: discount || null,
      stock: parseInt(stock) || 0,
      in_stock: parseInt(stock) > 0,
      image_url: imageUrl || null,
      description: description || 'Instant delivery',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('products')
      .insert([product])
      .select()
      .single();
    
    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to create product' });
    }
    
    res.status(201).json({ success: true, product: data });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update product
app.put('/api/admin/products/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { category, title, price, oldPrice, discount, stock, imageUrl, description, inStock } = req.body;
    
    const updates = {
      updated_at: new Date().toISOString()
    };
    
    if (category !== undefined) updates.category = category;
    if (title !== undefined) updates.title = title;
    if (price !== undefined) updates.price = parseFloat(price);
    if (oldPrice !== undefined) updates.old_price = oldPrice ? parseFloat(oldPrice) : null;
    if (discount !== undefined) updates.discount = discount || null;
    if (stock !== undefined) {
      updates.stock = parseInt(stock);
      updates.in_stock = parseInt(stock) > 0;
    }
    if (inStock !== undefined) updates.in_stock = inStock;
    if (imageUrl !== undefined) updates.image_url = imageUrl || null;
    if (description !== undefined) updates.description = description;
    
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to update product' });
    }
    
    res.json({ success: true, product: data });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update stock only
app.patch('/api/admin/products/:id/stock', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { stock } = req.body;
    
    if (stock === undefined) {
      return res.status(400).json({ error: 'Stock is required' });
    }
    
    const stockNum = parseInt(stock);
    
    const { data, error } = await supabase
      .from('products')
      .update({
        stock: stockNum,
        in_stock: stockNum > 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to update stock' });
    }
    
    res.json({ success: true, product: data });
  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete product
app.delete('/api/admin/products/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to delete product' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all products for admin (with more details)
app.get('/api/admin/products', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('category', { ascending: true })
      .order('title', { ascending: true });
    
    if (error) {
      return res.status(500).json({ error: 'Failed to fetch products' });
    }
    
    res.json({ products: data });
  } catch (error) {
    console.error('Admin get products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// ORDERS API
// ============================================

app.post('/api/orders', authenticateToken, async (req, res) => {
  try {
    const { items, minecraftUsername, total } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invalid order items' });
    }
    
    if (!minecraftUsername || minecraftUsername.length < 3 || minecraftUsername.length > 16) {
      return res.status(400).json({ error: 'Invalid Minecraft username' });
    }
    
    // Check stock for all items
    for (const item of items) {
      const { data: product } = await supabase
        .from('products')
        .select('stock, title')
        .eq('id', item.id)
        .single();
      
      if (product && product.stock < item.quantity) {
        return res.status(400).json({ 
          error: `Not enough stock for ${product.title}. Available: ${product.stock}` 
        });
      }
    }
    
    const orderId = generateOrderId();
    const now = new Date().toISOString();
    
    const order = {
      id: orderId,
      user_id: req.user.id,
      discord_username: req.user.username,
      discord_global_name: req.user.globalName,
      minecraft_username: minecraftUsername,
      items: items.map(item => ({
        id: item.id,
        title: item.title,
        price: item.price,
        quantity: item.quantity
      })),
      total: parseFloat(total),
      status: 'pending',
      status_history: [{ status: 'pending', timestamp: now, note: 'Order created' }],
      created_at: now,
      updated_at: now
    };
    
    const { error } = await supabase.from('orders').insert([order]);
    
    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to save order' });
    }
    
    // Decrease stock for ordered items
    for (const item of items) {
      await supabase.rpc('decrement_stock', { 
        product_id: item.id, 
        quantity: item.quantity 
      }).catch(() => {
        // Fallback if RPC doesn't exist
        supabase
          .from('products')
          .select('stock')
          .eq('id', item.id)
          .single()
          .then(({ data }) => {
            if (data) {
              const newStock = Math.max(0, data.stock - item.quantity);
              supabase
                .from('products')
                .update({ stock: newStock, in_stock: newStock > 0 })
                .eq('id', item.id);
            }
          });
      });
    }
    
    await sendDiscordNotification(order);
    
    res.status(201).json({ 
      success: true, 
      order: {
        id: order.id,
        status: order.status,
        total: order.total,
        createdAt: order.created_at
      }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      return res.status(500).json({ error: 'Failed to fetch orders' });
    }
    
    const orders = data.map(order => ({
      id: order.id,
      userId: order.user_id,
      discordUsername: order.discord_username,
      discordGlobalName: order.discord_global_name,
      minecraftUsername: order.minecraft_username,
      items: order.items,
      total: order.total,
      status: order.status,
      statusHistory: order.status_history || [],
      createdAt: order.created_at,
      updatedAt: order.updated_at
    }));
    
    res.json({ orders });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/orders/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    let query = supabase.from('orders').select('*').eq('id', orderId);
    
    if (!config.adminIds.includes(req.user.id)) {
      query = query.eq('user_id', req.user.id);
    }
    
    const { data, error } = await query.single();
    
    if (error || !data) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const order = {
      id: data.id,
      userId: data.user_id,
      discordUsername: data.discord_username,
      discordGlobalName: data.discord_global_name,
      minecraftUsername: data.minecraft_username,
      items: data.items,
      total: data.total,
      status: data.status,
      statusHistory: data.status_history || [],
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
    
    res.json({ order });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// ADMIN API
// ============================================

app.get('/api/admin/orders', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, search, limit = 50, offset = 0 } = req.query;
    
    let query = supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    
    if (search) {
      query = query.or(`id.ilike.%${search}%,minecraft_username.ilike.%${search}%,discord_username.ilike.%${search}%`);
    }
    
    const { data, error, count } = await query;
    
    if (error) {
      return res.status(500).json({ error: 'Failed to fetch orders' });
    }
    
    const orders = data.map(order => ({
      id: order.id,
      userId: order.user_id,
      discordUsername: order.discord_username,
      discordGlobalName: order.discord_global_name,
      minecraftUsername: order.minecraft_username,
      items: order.items,
      total: order.total,
      status: order.status,
      statusHistory: order.status_history || [],
      createdAt: order.created_at,
      updatedAt: order.updated_at
    }));
    
    res.json({ orders, total: count });
  } catch (error) {
    console.error('Admin get orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/admin/orders/:orderId/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, note } = req.body;
    
    const validStatuses = ['pending', 'processing', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const { data: currentOrder, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
    
    if (fetchError || !currentOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const oldStatus = currentOrder.status;
    const now = new Date().toISOString();
    
    const statusHistory = currentOrder.status_history || [];
    statusHistory.push({
      status: status,
      timestamp: now,
      note: note || `Status changed to ${status}`,
      changedBy: req.user.username
    });
    
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: status,
        status_history: statusHistory,
        updated_at: now
      })
      .eq('id', orderId);
    
    if (updateError) {
      return res.status(500).json({ error: 'Failed to update order' });
    }
    
    await sendStatusUpdateNotification({ ...currentOrder, status }, oldStatus, status);
    
    res.json({ success: true, order: { id: orderId, status, statusHistory } });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('status, total');
    
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('stock, in_stock');
    
    if (ordersError || productsError) {
      return res.status(500).json({ error: 'Failed to fetch stats' });
    }
    
    const stats = {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      processing: orders.filter(o => o.status === 'processing').length,
      completed: orders.filter(o => o.status === 'completed').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
      revenue: orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + parseFloat(o.total), 0),
      totalProducts: products.length,
      lowStock: products.filter(p => p.stock > 0 && p.stock <= 10).length,
      outOfStock: products.filter(p => p.stock === 0 || !p.in_stock).length
    };
    
    res.json({ stats });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload schematic
app.post('/api/schematics', authenticateToken, upload.single('file'), (req, res) => {
  const { title, description, anonymous } = req.body;
  if (!req.file || !req.file.originalname.endsWith('.litematica')) {
    return res.status(400).json({ error: 'Only .litematica files allowed.' });
  }
  if (!title || !description || description.length < 30) {
    return res.status(400).json({ error: 'Title and thoughtful description required.' });
  }
  const meta = loadSchematicMeta();
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const entry = {
    id,
    title,
    description,
    filename: req.file.filename,
    originalname: req.file.originalname,
    username: req.user.username,
    userId: req.user.id,
    anonymous: anonymous === 'true',
    createdAt: new Date().toISOString()
  };
  meta.push(entry);
  saveSchematicMeta(meta);
  res.json({ success: true, schematic: entry });
});

// List schematics
app.get('/api/schematics', (req, res) => {
  const meta = loadSchematicMeta();
  res.json({ schematics: meta });
});

// Download schematic (auth required)
app.get('/api/schematics/:id/download', authenticateToken, (req, res) => {
  const meta = loadSchematicMeta();
  const schematic = meta.find(s => s.id === req.params.id);
     if (!schematic) return res.status(404).json({ error: 'Not found' });
     const filePath = path.join(__dirname, 'schematics', schematic.filename);
     res.download(filePath, schematic.originalname);
   });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// ============================================
// ADMIN: LOGIN LOGS
// ============================================
app.get('/api/admin/login-logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    const { data, error } = await supabase
      .from('login_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch login logs' });
    }

    res.json({ logs: data });
  } catch (error) {
    console.error('Get login logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve schematic
app.post('/api/admin/schematics/:id/approve', authenticateToken, requireAdmin, (req, res) => {
  const meta = loadSchematicMeta();
  const schematic = meta.find(s => s.id === req.params.id);
  if (!schematic) return res.status(404).json({ error: 'Not found' });
  schematic.approved = true;
  saveSchematicMeta(meta);
  res.json({ success: true });
});

// Admin post schematic (auto-approved)
app.post('/api/admin/schematics', authenticateToken, requireAdmin, upload.single('file'), (req, res) => {
  const { title, description } = req.body;
  if (!req.file || !req.file.originalname.endsWith('.litematica')) {
    return res.status(400).json({ error: 'Only .litematica files allowed.' });
  }
  if (!title || !description || description.length < 30) {
    return res.status(400).json({ error: 'Title and thoughtful description required.' });
  }
  const meta = loadSchematicMeta();
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const entry = {
    id,
    title,
    description,
    filename: req.file.filename,
    originalname: req.file.originalname,
    username: req.user.username,
    userId: req.user.id,
    anonymous: false,
    approved: true,
    createdAt: new Date().toISOString()
  };
  meta.push(entry);
  saveSchematicMeta(meta);
  res.json({ success: true, schematic: entry });
});
