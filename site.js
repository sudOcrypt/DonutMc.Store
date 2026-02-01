// ============================================
// DISCORD AUTHENTICATION
// ============================================

const AUTH_CONFIG = {
  clientId: '1386561405817454612',
  redirectUri: encodeURIComponent('http://localhost:3000/auth/callback'),
  scopes: 'identify+email+guilds.join'
};

// Current user state
let currentUser = null;

// Build Discord OAuth2 URL
function getDiscordAuthUrl() {
  return `https://discord.com/oauth2/authorize?client_id=1467193651938459661&response_type=code&redirect_uri=${encodeURIComponent('https://donutmc.store/auth/callback')}&scope=identify+email+guilds.join`;
}

// Check for auth token in URL (after Discord redirect)
function handleAuthCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const error = urlParams.get('error');
  
  if (error) {
    showToast('Login failed. Please try again.');
    window.history.replaceState({}, document.title, window.location.pathname);
    return;
  }
  
  if (token) {
    localStorage.setItem('donutmc_auth_token', token);
    window.history.replaceState({}, document.title, window.location.pathname);
    loadUserFromToken();
    showToast('Successfully logged in! 🎉');
  }
}

// Load user data from stored token
function loadUserFromToken() {
  const token = localStorage.getItem('donutmc_auth_token');
  
  if (!token) {
    currentUser = null;
    updateAuthUI();
    return;
  }
  
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      logout();
      return;
    }
    
    currentUser = decoded;
    updateAuthUI();
  } catch (e) {
    console.error('Failed to decode token:', e);
    logout();
  }
}

// Get auth token
function getAuthToken() {
  return localStorage.getItem('donutmc_auth_token');
}

// Toggle user dropdown menu
function toggleUserMenu() {
  const dropdown = document.getElementById('userDropdown');
  if (dropdown) {
    dropdown.classList.toggle('show');
  }
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('userDropdown');
  const profileBtn = document.querySelector('.user-profile-btn');
  
  if (dropdown && profileBtn && !profileBtn.contains(e.target) && !dropdown.contains(e.target)) {
    dropdown.classList.remove('show');
  }
});

// Login function - redirect to Discord
function showLogin() {
  window.location.href = getDiscordAuthUrl();
}

// Logout function
function logout() {
  localStorage.removeItem('donutmc_auth_token');
  currentUser = null;
  updateAuthUI();
  showToast('Logged out successfully');
}

// Check if user is logged in
function isLoggedIn() {
  return currentUser !== null;
}

// Get current user
function getCurrentUser() {
  return currentUser;
}

// Check if user is admin
function isAdmin() {
  return currentUser && currentUser.isAdmin === true;
}

// Update UI based on auth state
function updateAuthUI() {
  const navbarRight = document.querySelector('.navbar-right');
  if (!navbarRight) return;
  
  const existingProfile = navbarRight.querySelector('.user-profile-btn');
  const existingDropdown = navbarRight.querySelector('.user-dropdown');
  const existingLoginBtn = navbarRight.querySelector('.login-btn');
  
  if (existingProfile) existingProfile.remove();
  if (existingDropdown) existingDropdown.remove();
  if (existingLoginBtn) existingLoginBtn.remove();
  
  if (currentUser) {
    const avatarUrl = currentUser.avatar 
      ? `https://cdn.discordapp.com/avatars/${currentUser.id}/${currentUser.avatar}.png`
      : `https://cdn.discordapp.com/embed/avatars/${parseInt(currentUser.discriminator || '0') % 5}.png`;
    
    const displayName = currentUser.globalName || currentUser.username;
    
    const adminLink = isAdmin() ? `
      <button type="button" class="dropdown-item" onclick="showPage('admin'); document.getElementById('userDropdown').classList.remove('show');">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
        Admin Dashboard
      </button>
      <div class="dropdown-divider"></div>
    ` : '';
    
    const profileHTML = `
      <div class="user-profile-btn" onclick="toggleUserMenu()">
        <img src="${avatarUrl}" alt="Avatar" class="user-avatar">
        <span class="user-name">${escapeHtml(displayName)}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m6 9 6 6 6-6"></path>
        </svg>
      </div>
      <div class="user-dropdown" id="userDropdown">
        <div class="dropdown-header">
          <img src="${avatarUrl}" alt="Avatar" class="dropdown-avatar">
          <div class="dropdown-user-info">
            <span class="dropdown-name">${escapeHtml(displayName)}</span>
            <span class="dropdown-username">@${escapeHtml(currentUser.username)}</span>
          </div>
        </div>
        <div class="dropdown-divider"></div>
        ${adminLink}
        <button type="button" class="dropdown-item" onclick="showOrderHistory()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
          My Orders
        </button>
        <div class="dropdown-divider"></div>
        <button type="button" class="dropdown-item dropdown-logout" onclick="logout()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          Logout
        </button>
      </div>
    `;
    
    const cartBtn = navbarRight.querySelector('.cart-btn');
    cartBtn.insertAdjacentHTML('beforebegin', profileHTML);
  } else {
    const loginHTML = `
      <button type="button" class="login-btn" onclick="showLogin()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        <span>Login</span>
      </button>
    `;
    
    const cartBtn = navbarRight.querySelector('.cart-btn');
    cartBtn.insertAdjacentHTML('beforebegin', loginHTML);
  }
}


// ============================================
// ORDER HISTORY
// ============================================

async function fetchOrderHistory() {
  const token = getAuthToken();
  if (!token) return [];
  
  try {
    const response = await fetch('/api/orders', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch orders');
    }
    
    const data = await response.json();
    return data.orders || [];
  } catch (error) {
    console.error('Error fetching order history:', error);
    return [];
  }
}

async function showOrderHistory() {
  const dropdown = document.getElementById('userDropdown');
  if (dropdown) dropdown.classList.remove('show');
  
  if (!isLoggedIn()) {
    showToast('Please login to view order history');
    return;
  }
  
  showOrderHistoryModal(null, true);
  const orders = await fetchOrderHistory();
  showOrderHistoryModal(orders, false);
}

function showOrderHistoryModal(orders, loading = false) {
  const existingModal = document.getElementById('orderHistoryModal');
  if (existingModal) existingModal.remove();
  
  const modal = document.createElement('div');
  modal.id = 'orderHistoryModal';
  modal.className = 'modal-overlay';
  
  let contentHTML = '';
  
  if (loading) {
    contentHTML = `
      <div class="orders-loading">
        <div class="loading-spinner"></div>
        <p>Loading your orders...</p>
      </div>
    `;
  } else if (!orders || orders.length === 0) {
    contentHTML = `
      <div class="orders-empty">
        <div class="orders-empty-icon">📦</div>
        <h3>No Orders Yet</h3>
        <p>Your order history will appear here once you make a purchase.</p>
        <button type="button" class="browse-products-btn" onclick="closeOrderHistoryModal(); showPage('home');">
          Browse Products
        </button>
      </div>
    `;
  } else {
    contentHTML = `
      <div class="orders-list">
        ${orders.map(order => `
          <div class="order-card clickable" data-order-id="${order.id}" onclick="showOrderDetail('${order.id}')">
            <div class="order-header">
              <div class="order-id-section">
                <span class="order-id">${escapeHtml(order.id)}</span>
                <span class="order-status order-status-${order.status}">${capitalizeFirst(order.status)}</span>
              </div>
              <span class="order-date">${formatDate(order.createdAt)}</span>
            </div>
            <div class="order-items">
              ${order.items.map(item => `
                <div class="order-item">
                  <span class="order-item-name">${escapeHtml(item.title)} x${item.quantity}</span>
                  <span class="order-item-price">${escapeHtml(item.price)}</span>
                </div>
              `).join('')}
            </div>
            <div class="order-footer">
              <div class="order-minecraft">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>${escapeHtml(order.minecraftUsername)}</span>
              </div>
              <span class="order-total">Total: $${parseFloat(order.total).toFixed(2)}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  modal.innerHTML = `
    <div class="modal-content order-history-modal">
      <button type="button" class="modal-close" onclick="closeOrderHistoryModal()">&times;</button>
      <h2 class="modal-title">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
        Order History
      </h2>
      ${contentHTML}
    </div>
  `;
  
  document.body.appendChild(modal);
}

function closeOrderHistoryModal() {
  const modal = document.getElementById('orderHistoryModal');
  if (modal) {
    modal.classList.add('closing');
    setTimeout(() => modal.remove(), 300);
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============================================
// DYNAMIC DATA - Products & Categories from API
// ============================================

let products = [];
let categories = [];

async function loadProducts() {
  try {
    const response = await fetch('/api/products');
    if (!response.ok) throw new Error('Failed to fetch products');
    const data = await response.json();
    products = data.products;
    renderProducts();
  } catch (error) {
    console.error('Error loading products:', error);
    products = [];
    renderProducts();
  }
}

async function loadCategories() {
  try {
    const response = await fetch('/api/categories');
    if (!response.ok) throw new Error('Failed to fetch categories');
    const data = await response.json();
    categories = data.categories;
    renderCategories();
  } catch (error) {
    console.error('Error loading categories:', error);
    categories = [
      { name: 'Money', icon: '💰', count: 0 },
      { name: 'Items', icon: '📦', count: 0 },
      { name: 'Bases', icon: '🏠', count: 0 }
    ];
    renderCategories();
  }
}

// ============================================
// STATIC DATA
// ============================================

const paymentMethods1 = ['Apple Pay', 'Google Pay', 'Mastercard', 'Visa', 'Amex'];
const paymentMethods2 = ['Discover', 'Diners Club', 'ETC', 'JCB', 'UnionPay'];

const reviews = [
  { id: 1, username: 'itsw0ld.', rating: 5, review: 'Good shop, got my items instantly.', date: 'Jan 27, 2026' },
  { id: 2, username: 'wgky', rating: 5, review: '+rep instant service', date: 'Jan 20, 2026' },
  { id: 3, username: '_m0tchaa_', rating: 5, review: 'elytra was delivered quickly and service was good', date: 'Jan 19, 2026' },
  { id: 4, username: 'xKr4zy_', rating: 5, review: 'Best prices on the market, 10/10 would buy again', date: 'Jan 18, 2026' },
  { id: 5, username: 'NotchFan2009', rating: 5, review: 'Super fast delivery, got my coins in under a minute!', date: 'Jan 17, 2026' },
  { id: 6, username: 'ii_Shxdow', rating: 5, review: 'Legit seller, trusted 100%', date: 'Jan 16, 2026' },
  { id: 7, username: 'Bl4zeKing', rating: 5, review: 'bought 10m coins, instant delivery ty', date: 'Jan 15, 2026' },
  { id: 8, username: '_Frostbyte', rating: 5, review: 'Great communication and fast service', date: 'Jan 14, 2026' },
  { id: 9, username: 'zPvPGod_', rating: 5, review: 'spawners delivered instantly, +vouch', date: 'Jan 13, 2026' },
  { id: 10, username: 'CreeperSlayer99', rating: 5, review: 'Amazing shop! Will definitely come back', date: 'Jan 12, 2026' }
];

const faqs = [
  {
    question: 'How do I receive my items?',
    answer: 'After purchase, you\'ll receive your items instantly through our automated delivery system. Simply provide your DonutSMP username during checkout, and items will be delivered directly to your in-game account within seconds.'
  },
  {
    question: 'Is this a scam?',
    answer: 'Absolutely not! We have over 6000+ completed orders and 1500+ verified vouches from satisfied customers. We\'re a trusted marketplace with instant delivery and a money-back guarantee. All transactions are secure and protected.'
  },
  {
    question: 'I have a question, how do I contact you?',
    answer: 'You can reach our support team 24/7 through Discord, email, or our live chat feature. We typically respond within minutes and are always happy to help with any questions or concerns.'
  }
];

// ============================================
// STATE
// ============================================

let selectedCategory = 0;
let cart = [];

// ============================================
// UTILITY FUNCTIONS
// ============================================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function loadCart() {
  try {
    const savedCart = localStorage.getItem('donutmc_cart');
    if (savedCart) {
      cart = JSON.parse(savedCart);
    }
  } catch (e) {
    console.error('Failed to load cart from localStorage:', e);
    cart = [];
  }
}

function saveCart() {
  try {
    localStorage.setItem('donutmc_cart', JSON.stringify(cart));
  } catch (e) {
    console.error('Failed to save cart to localStorage:', e);
  }
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
  // Auth first
  handleAuthCallback();
  loadUserFromToken();
  loadCart();

    // Schematic upload form event binding
  const schematicForm = document.getElementById('schematicUploadForm');
  if (schematicForm) {
    schematicForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      if (!isLoggedIn()) {
        showToast('Please login to upload schematics.');
        showLogin();
        return;
      }
      const file = document.getElementById('schematicFile').files[0];
      if (!file || !file.name.endsWith('.litematic')) {
        showToast('Only .litematic files are allowed.');
        return;
      }
      const title = document.getElementById('schematicTitle').value.trim();
      const description = document.getElementById('schematicDescription').value.trim();
      if (description.length < 30) {
        showToast('Description must be at least 30 characters.');
        return;
      }
      const anonymous = document.getElementById('schematicAnonymous').checked;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('anonymous', anonymous);

      const token = getAuthToken();
      const res = await fetch('/api/schematics', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        showSchematicUploadSuccess();
        schematicForm.reset();
        loadSchematics();
      } else {
        showToast(data.error || 'Upload failed');
      }
    });
  }
  loadSchematics();

  document.getElementById('schematicFile')?.addEventListener('change', function(e) {
  const label = document.getElementById('schematicFileLabel');
  if (label && this.files.length > 0) {
    label.textContent = this.files[0].name;
  } else if (label) {
    label.textContent = 'Choose file...';
  }
});
  
  // Load dynamic data from API
  await Promise.all([loadCategories(), loadProducts()]);
  
  // Render static content
  renderPaymentCarousel();
  renderReviews('reviewsContainer');
  renderReviews('reviewsList');
  renderFAQ();
  updateCartCount();
  renderCartPage();
});

// ============================================
// NAVIGATION
// ============================================

function showPage(pageName) {
  // Hide all main pages
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active', 'fade-in', 'fade-out');
  });

  // Hide all admin tab contents
  document.querySelectorAll('.admin-tab-content').forEach(tab => tab.classList.remove('active'));

  // Show the requested page
  const targetPage = document.getElementById(`${pageName}-page`);
  if (targetPage) {
    targetPage.classList.add('active', 'fade-in');
    setTimeout(() => targetPage.classList.remove('fade-in'), 300);

    // If admin page, show the default admin tab
    if (pageName === 'admin' && isAdmin()) {
      // Show the default admin tab (orders) or last active tab if you track it
      document.getElementById('ordersTab').classList.add('active');
      loadAdminStats();
      loadAdminOrders();
    }
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openCart() {
  showPage('cart');
}

function closeCart() {
  showPage('home');
}

// ============================================
// CART FUNCTIONS
// ============================================

function updateCartCount() {
  const cartCount = document.getElementById('cartCount');
  if (!cartCount) return;
  
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartCount.textContent = totalItems;
  
  cartCount.classList.add('updated');
  setTimeout(() => {
    cartCount.classList.remove('updated');
  }, 500);
}

function getCartTotal() {
  return cart.reduce((sum, item) => {
    const price = parseFloat(item.price.replace('$', ''));
    return sum + (price * item.quantity);
  }, 0);
}

function addToCart(productId, quantity = 1) {
  const product = products.find(p => p.id === productId);
  
  if (product) {
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.push({
        id: product.id,
        title: product.title,
        price: product.price,
        emoji: product.emoji,
        quantity: quantity
      });
    }
    
    saveCart();
    updateCartCount();
    showToast(`Added ${escapeHtml(product.title)} to cart! 🎉`);
  }
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  saveCart();
  updateCartCount();
  renderCartPage();
  showToast('Item removed from cart');
}

function updateCartItemQuantity(productId, newQuantity) {
  const item = cart.find(item => item.id === productId);
  if (item) {
    if (newQuantity <= 0) {
      removeFromCart(productId);
    } else {
      item.quantity = newQuantity;
      saveCart();
      updateCartCount();
      renderCartPage();
    }
  }
}

function clearCart() {
  cart = [];
  saveCart();
  updateCartCount();
  renderCartPage();
  showToast('Cart cleared');
}

function renderCartPage() {
  const cartItemsContainer = document.getElementById('cartItems');
  const cartTotalContainer = document.querySelector('.cart-total');
  
  if (!cartItemsContainer) return;
  
  if (cart.length === 0) {
    cartItemsContainer.innerHTML = `
      <div class="empty-cart-page">
        <div class="empty-cart-icon">🛒</div>
        <h3>Your cart is empty</h3>
        <p>Add some items to get started!</p>
        <button type="button" class="browse-products-btn" onclick="showPage('home')">
          Browse Products
        </button>
      </div>
    `;
    
    if (cartTotalContainer) {
      cartTotalContainer.style.display = 'none';
    }
    return;
  }
  
  if (cartTotalContainer) {
    cartTotalContainer.style.display = 'block';
  }
  
  cartItemsContainer.innerHTML = cart.map(item => `
    <div class="cart-item" data-id="${item.id}">
      <div class="cart-item-content">
        <div class="cart-item-icon">${item.emoji}</div>
        <div class="cart-item-info">
          <h3 class="cart-item-title">${escapeHtml(item.title)}</h3>
          <p class="cart-item-price-each">${escapeHtml(item.price)} each</p>
        </div>
      </div>
      <div class="cart-item-actions">
        <div class="cart-qty-controls">
          <button type="button" class="qty-btn" onclick="updateCartItemQuantity(${item.id}, ${item.quantity - 1})" aria-label="Decrease quantity">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14"></path>
            </svg>
          </button>
          <span class="cart-qty-display">${item.quantity}</span>
          <button type="button" class="qty-btn" onclick="updateCartItemQuantity(${item.id}, ${item.quantity + 1})" aria-label="Increase quantity">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14"></path>
              <path d="M12 5v14"></path>
            </svg>
          </button>
        </div>
        <span class="cart-item-price">$${(parseFloat(item.price.replace('$', '')) * item.quantity).toFixed(2)}</span>
        <button type="button" class="delete-btn" onclick="removeFromCart(${item.id})" aria-label="Remove item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18"></path>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
  
  const totalAmount = document.querySelector('.cart-total-amount');
  if (totalAmount) {
    totalAmount.textContent = `$${getCartTotal().toFixed(2)}`;
  }
}

// ============================================
// CHECKOUT WITH ORDER CREATION
// ============================================

function proceedToCheckout() {
  if (cart.length === 0) {
    showToast('Your cart is empty!');
    return;
  }
  
  if (!isLoggedIn()) {
    showToast('Please login to checkout');
    setTimeout(() => showLogin(), 1000);
    return;
  }
  
  showCheckoutModal();
}

function showCheckoutModal() {
  const existingModal = document.getElementById('checkoutModal');
  if (existingModal) existingModal.remove();
  
  const total = getCartTotal().toFixed(2);
  const user = getCurrentUser();
  
  const avatarUrl = user.avatar 
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
    : `https://cdn.discordapp.com/embed/avatars/0.png`;
  
  const modal = document.createElement('div');
  modal.id = 'checkoutModal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content checkout-modal">
      <button type="button" class="modal-close" onclick="closeCheckoutModal()">&times;</button>
      <h2 class="modal-title">Complete Your Order</h2>
      
      <div class="checkout-summary">
        <div class="checkout-user">
          <img src="${avatarUrl}" alt="Avatar" class="checkout-avatar">
          <div>
            <p class="checkout-username">${escapeHtml(user.globalName || user.username)}</p>
            <p class="checkout-discord">Discord: ${escapeHtml(user.username)}</p>
          </div>
        </div>
        
        <div class="checkout-total">
          <span>Total:</span>
          <span class="checkout-amount">$${total}</span>
        </div>
      </div>
      
      <div class="checkout-form">
        <label for="minecraftUsername" class="checkout-label">
          Minecraft Username
          <span class="checkout-hint">Enter your exact DonutSMP username</span>
        </label>
        <input 
          type="text" 
          id="minecraftUsername" 
          class="checkout-input" 
          placeholder="Enter your Minecraft username"
          maxlength="16"
          autocomplete="off"
        >
        
        <button type="button" class="checkout-submit-btn" id="checkoutSubmitBtn" onclick="submitOrder()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect width="20" height="14" x="2" y="5" rx="2"></rect>
            <path d="M2 10h20"></path>
          </svg>
          Pay $${total}
        </button>
      </div>
      
      <p class="checkout-note">
        After payment, items will be delivered instantly to your Minecraft account.
      </p>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  setTimeout(() => {
    document.getElementById('minecraftUsername')?.focus();
  }, 100);
}

function closeCheckoutModal() {
  const modal = document.getElementById('checkoutModal');
  if (modal) {
    modal.classList.add('closing');
    setTimeout(() => modal.remove(), 300);
  }
}

async function submitOrder() {
  const minecraftUsername = document.getElementById('minecraftUsername')?.value.trim();
  const submitBtn = document.getElementById('checkoutSubmitBtn');
  
  if (!minecraftUsername) {
    showToast('Please enter your Minecraft username');
    return;
  }
  
  if (minecraftUsername.length < 3 || minecraftUsername.length > 16) {
    showToast('Invalid Minecraft username');
    return;
  }
  
  const total = getCartTotal().toFixed(2);
  const token = getAuthToken();
  
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<div class="btn-spinner"></div> Processing...`;
  }
  
  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        items: cart,
        minecraftUsername: minecraftUsername,
        total: total
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to create order');
    }
    
    showToast(`Order ${data.order.id} created! Redirecting to payment...`);
    closeCheckoutModal();
    
    cart = [];
    saveCart();
    updateCartCount();
    renderCartPage();
    
    setTimeout(() => {
      window.open('https://discord.gg/5GdyQdhc4H', '_blank');
    }, 1500);
    
  } catch (error) {
    console.error('Order creation error:', error);
    showToast(error.message || 'Failed to create order. Please try again.');
    
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect width="20" height="14" x="2" y="5" rx="2"></rect>
          <path d="M2 10h20"></path>
        </svg>
        Pay $${total}
      `;
    }
  }
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================

function showToast(message) {
  const existingToasts = document.querySelectorAll('.toast');
  existingToasts.forEach(t => t.remove());
  
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 100);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ============================================
// CATEGORIES
// ============================================

function renderCategories() {
  const container = document.getElementById('categoryPills');
  if (!container) return;
  
  container.innerHTML = categories.map((cat, index) => `
    <button type="button" class="category-pill ${index === selectedCategory ? 'active' : ''}" onclick="selectCategory(${index})">
      <span>${cat.icon}</span>
      <span>${escapeHtml(cat.name)}</span>
      <span style="opacity: 0.6; font-size: 0.75rem;">(${cat.count})</span>
    </button>
  `).join('');
}

function selectCategory(index) {
  selectedCategory = index;
  renderCategories();
  renderProducts();
}

// ============================================
// PRODUCTS
// ============================================

function renderProducts() {
  const container = document.getElementById('productsContainer');
  if (!container) return;

  if (categories.length === 0) {
    container.innerHTML = '<div class="admin-loading">Loading products...</div>';
    return;
  }

  const selectedCategoryName = categories[selectedCategory]?.name || 'Money';
  const filteredProducts = products.filter(product => product.category === selectedCategoryName);

  if (filteredProducts.length === 0) {
    container.innerHTML = `
      <div class="no-products">
        <div class="no-products-icon">${categories[selectedCategory]?.icon || '📦'}</div>
        <h3 class="no-products-title">Coming Soon!</h3>
        <p class="no-products-text">We're working on adding ${escapeHtml(selectedCategoryName.toLowerCase())} to our store. Check back soon!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filteredProducts.map(product => `
    <div class="product-card" data-product-id="${product.id}">
      <div class="product-card-content">
        <div class="product-emoji">
  ${product.imageUrl ? `<img src="${product.imageUrl}" alt="${escapeHtml(product.title)}" class="product-image">` : product.emoji}
</div>
        <div class="product-info">
          <div class="product-header">
            <h3 class="product-title">${escapeHtml(product.title)}</h3>
            <span class="stock-badge ${product.inStock ? '' : 'out-of-stock'}">${product.inStock ? 'In Stock' : 'Out of Stock'}</span>
          </div>
          <p class="product-details">Instant delivery</p>
          <div class="stock-info">
            <span class="stock-number">${product.stock} available</span>
          </div>
          <div class="product-pricing">
            <span class="product-price">${escapeHtml(product.price)}</span>
            ${product.oldPrice ? `<span class="product-old-price">${escapeHtml(product.oldPrice)}</span>` : ''}
            ${product.discount ? `<span class="product-discount">${escapeHtml(product.discount)}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="product-actions">
        <div class="quantity-controls">
          <button type="button" class="qty-btn" onclick="decreaseProductQty(${product.id})" aria-label="Decrease quantity">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14"></path>
            </svg>
          </button>
          <span class="qty-display" id="qty-${product.id}">1</span>
          <button type="button" class="qty-btn" onclick="increaseProductQty(${product.id})" aria-label="Increase quantity">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14"></path>
              <path d="M12 5v14"></path>
            </svg>
          </button>
        </div>
${isLoggedIn() ? `
  <button type="button" class="add-to-cart-btn" onclick="addProductToCart(${product.id})" ${!product.inStock ? 'disabled' : ''}>
    <svg width="20" height="20" ...></svg>
    Add to Cart
  </button>
` : `
  <button type="button" class="add-to-cart-btn" onclick="showLogin()" style="filter: blur(0);">
    <svg width="20" height="20" ...></svg>
    Login to Purchase
  </button>
`}
      </div>
    </div>
  `).join('');
}

// ============================================
// PRODUCT QUANTITY CONTROLS
// ============================================

const productQuantities = {};

function getProductQty(productId) {
  return productQuantities[productId] || 1;
}

function increaseProductQty(productId) {
  productQuantities[productId] = (productQuantities[productId] || 1) + 1;
  updateProductQtyDisplay(productId);
}

function decreaseProductQty(productId) {
  if ((productQuantities[productId] || 1) > 1) {
    productQuantities[productId] = (productQuantities[productId] || 1) - 1;
    updateProductQtyDisplay(productId);
  }
}

function updateProductQtyDisplay(productId) {
  const display = document.getElementById(`qty-${productId}`);
  if (display) {
    display.textContent = getProductQty(productId);
  }
}

function addProductToCart(productId) {
  const quantity = getProductQty(productId);
  addToCart(productId, quantity);
  productQuantities[productId] = 1;
  updateProductQtyDisplay(productId);
}

// ============================================
// PAYMENT CAROUSEL
// ============================================

function renderPaymentCarousel() {
  const paymentTrack1 = document.getElementById('paymentTrack1');
  const paymentTrack2 = document.getElementById('paymentTrack2');
  
  if (!paymentTrack1 || !paymentTrack2) return;
  
  const methods1Repeated = [...paymentMethods1, ...paymentMethods1, ...paymentMethods1, ...paymentMethods1];
  const methods2Repeated = [...paymentMethods2, ...paymentMethods2, ...paymentMethods2, ...paymentMethods2];
  
  paymentTrack1.innerHTML = methods1Repeated.map(method => `
    <div class="payment-method">${escapeHtml(method)}</div>
  `).join('');
  
  paymentTrack2.innerHTML = methods2Repeated.map(method => `
    <div class="payment-method">${escapeHtml(method)}</div>
  `).join('');
}

// ============================================
// REVIEWS
// ============================================

function renderReviews(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = reviews.map(review => `
    <div class="review-card">
      <div class="review-stars">
        ${'<svg class="star" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>'.repeat(review.rating)}
      </div>
      <div class="review-username">${escapeHtml(review.username)}</div>
      <div class="review-text">${escapeHtml(review.review)}</div>
      <div class="review-date">${escapeHtml(review.date)}</div>
    </div>
  `).join('');
}

function nextReview() {
  const container = document.getElementById('reviewsContainer');
  if (container) {
    container.scrollBy({ left: 350, behavior: 'smooth' });
  }
}

function prevReview() {
  const container = document.getElementById('reviewsContainer');
  if (container) {
    container.scrollBy({ left: -350, behavior: 'smooth' });
  }
}

// ============================================
// FAQ
// ============================================

function renderFAQ() {
  const container = document.getElementById('faqList');
  if (!container) return;
  
  container.innerHTML = faqs.map((faq, index) => `
    <div class="faq-item" id="faq-${index}" onclick="toggleFAQ(${index})" tabindex="0" role="button" aria-expanded="false">
      <div class="faq-question">
        <div class="faq-question-text">${escapeHtml(faq.question)}</div>
        <svg class="faq-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m6 9 6 6 6-6"></path>
        </svg>
      </div>
      <div class="faq-answer">
        <div class="faq-answer-text">${escapeHtml(faq.answer)}</div>
      </div>
    </div>
  `).join('');
}

function toggleFAQ(index) {
  const item = document.getElementById(`faq-${index}`);
  if (item) {
    const isActive = item.classList.contains('active');
    item.classList.toggle('active');
    item.setAttribute('aria-expanded', !isActive);
  }
}

// ============================================
// ORDER DETAIL VIEW
// ============================================

async function showOrderDetail(orderId) {
  closeOrderHistoryModal();
  
  const token = getAuthToken();
  if (!token) return;
  
  const modal = document.createElement('div');
  modal.id = 'orderDetailModal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content order-detail-modal">
      <button type="button" class="modal-close" onclick="closeOrderDetailModal()">&times;</button>
      <div class="orders-loading">
        <div class="loading-spinner"></div>
        <p>Loading order details...</p>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  
  try {
    const response = await fetch(`/api/orders/${orderId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) throw new Error('Failed to fetch order');
    
    const { order } = await response.json();
    renderOrderDetail(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    showToast('Failed to load order details');
    closeOrderDetailModal();
  }
}

function renderOrderDetail(order) {
  const modal = document.getElementById('orderDetailModal');
  if (!modal) return;
  
  const statusColors = {
    pending: 'order-status-pending',
    processing: 'order-status-processing',
    completed: 'order-status-completed',
    cancelled: 'order-status-cancelled'
  };
  
  const timelineHTML = (order.statusHistory || []).map((entry, index, arr) => `
    <div class="timeline-item ${index === arr.length - 1 ? 'current' : ''}">
      <div class="timeline-dot"></div>
      <div class="timeline-status">${entry.status}</div>
      <div class="timeline-time">${formatDate(entry.timestamp)}</div>
      ${entry.note ? `<div class="timeline-note">${escapeHtml(entry.note)}</div>` : ''}
    </div>
  `).join('');
  
  const itemsHTML = order.items.map(item => `
    <div class="order-detail-item">
      <div class="order-detail-item-info">
        <span class="order-detail-item-qty">x${item.quantity}</span>
        <span class="order-detail-item-name">${escapeHtml(item.title)}</span>
      </div>
      <span class="order-detail-item-price">${escapeHtml(item.price)}</span>
    </div>
  `).join('');
  
  modal.querySelector('.modal-content').innerHTML = `
    <button type="button" class="modal-close" onclick="closeOrderDetailModal()">&times;</button>
    
    <div class="order-detail-header">
      <div class="order-detail-id">${escapeHtml(order.id)}</div>
      <span class="order-detail-status order-status ${statusColors[order.status]}">${capitalizeFirst(order.status)}</span>
    </div>
    
    <div class="order-detail-section">
      <div class="order-detail-section-title">Order Information</div>
      <div class="order-detail-row">
        <span class="order-detail-label">Created</span>
        <span class="order-detail-value">${formatDate(order.createdAt)}</span>
      </div>
      <div class="order-detail-row">
        <span class="order-detail-label">Minecraft Username</span>
        <span class="order-detail-value">${escapeHtml(order.minecraftUsername)}</span>
      </div>
      <div class="order-detail-row">
        <span class="order-detail-label">Discord</span>
        <span class="order-detail-value">${escapeHtml(order.discordGlobalName || order.discordUsername)}</span>
      </div>
    </div>
    
    <div class="order-detail-section">
      <div class="order-detail-section-title">Items</div>
      <div class="order-detail-items">
        ${itemsHTML}
      </div>
      <div class="order-detail-total">
        <span class="order-detail-total-label">Total</span>
        <span class="order-detail-total-value">$${parseFloat(order.total).toFixed(2)}</span>
      </div>
    </div>
    
    <div class="order-detail-section">
      <div class="order-detail-section-title">Status Timeline</div>
      <div class="status-timeline">
        ${timelineHTML || '<p style="color: var(--gray-500);">No status history available</p>'}
      </div>
    </div>
  `;
}

function closeOrderDetailModal() {
  const modal = document.getElementById('orderDetailModal');
  if (modal) {
    modal.classList.add('closing');
    setTimeout(() => modal.remove(), 300);
  }
}

// ============================================
// ADMIN DASHBOARD
// ============================================

let searchTimeout;
function debounceSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(loadAdminOrders, 300);
}

async function loadAdminStats() {
  const token = getAuthToken();
  if (!token || !isAdmin()) return;
  
  try {
    const response = await fetch('/api/admin/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) return;
    
    const { stats } = await response.json();
    
    document.getElementById('statTotal').textContent = stats.total;
    document.getElementById('statPending').textContent = stats.pending;
    document.getElementById('statProcessing').textContent = stats.processing;
    document.getElementById('statCompleted').textContent = stats.completed;
    document.getElementById('statRevenue').textContent = `$${stats.revenue.toFixed(2)}`;
  } catch (error) {
    console.error('Error loading admin stats:', error);
  }
}

async function loadAdminOrders() {
  const token = getAuthToken();
  if (!token || !isAdmin()) return;
  
  const container = document.getElementById('adminOrders');
  if (!container) return;
  
  const search = document.getElementById('adminSearch')?.value || '';
  const status = document.getElementById('adminStatusFilter')?.value || 'all';
  
  container.innerHTML = '<div class="admin-loading">Loading orders...</div>';
  
  try {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status !== 'all') params.append('status', status);
    
    const response = await fetch(`/api/admin/orders?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) throw new Error('Failed to fetch orders');
    
    const { orders } = await response.json();
    
    if (orders.length === 0) {
      container.innerHTML = '<div class="admin-no-orders">No orders found</div>';
      return;
    }
    
    container.innerHTML = orders.map(order => `
      <div class="admin-order-card">
        <div class="admin-order-main">
          <div class="admin-order-id">${escapeHtml(order.id)}</div>
          <div class="admin-order-user">${escapeHtml(order.discordGlobalName || order.discordUsername)}</div>
          <div class="admin-order-minecraft">MC: ${escapeHtml(order.minecraftUsername)}</div>
        </div>
        <div class="admin-order-items">${order.items.length} item(s)</div>
        <div class="admin-order-total">$${parseFloat(order.total).toFixed(2)}</div>
        <div class="admin-order-date">${formatDate(order.createdAt)}</div>
        <div class="admin-order-actions">
          <select class="admin-status-select" onchange="updateOrderStatus('${order.id}', this.value)">
            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>🟡 Pending</option>
            <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>🔵 Processing</option>
            <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>🟢 Completed</option>
            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>🔴 Cancelled</option>
          </select>
          <button type="button" class="admin-view-btn" onclick="showOrderDetail('${order.id}')">View</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading admin orders:', error);
    container.innerHTML = '<div class="admin-no-orders">Failed to load orders</div>';
  }
}

async function updateOrderStatus(orderId, newStatus) {
  const token = getAuthToken();
  if (!token || !isAdmin()) return;
  
  try {
    const response = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: newStatus })
    });
    
    if (!response.ok) throw new Error('Failed to update status');
    
    showToast(`Order ${orderId} updated to ${newStatus}`);
    loadAdminStats();
  } catch (error) {
    console.error('Error updating order status:', error);
    showToast('Failed to update order status');
    loadAdminOrders();
  }
}

// ============================================
// ADMIN PRODUCT MANAGEMENT
// ============================================

let currentAdminTab = 'orders';
let adminProducts = [];


async function loadAdminProducts() {
  const token = getAuthToken();
  if (!token || !isAdmin()) return;

  const container = document.getElementById('adminProducts');
  if (!container) return;

  container.innerHTML = '<div class="admin-loading">Loading products...</div>';

  try {
    const response = await fetch('/api/admin/products', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Failed to fetch products');

    const data = await response.json();
    adminProducts = data.products;

    const searchTerm = document.getElementById('productSearch')?.value.toLowerCase() || '';
    const categoryFilter = document.getElementById('productCategoryFilter')?.value || 'all';

    let filtered = adminProducts;
    if (searchTerm) {
      filtered = filtered.filter(p => p.title.toLowerCase().includes(searchTerm));
    }
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }

    if (filtered.length === 0) {
      container.innerHTML = '<div class="admin-no-orders">No products found</div>';
      return;
    }

    container.innerHTML = filtered.map(product => {
      const stockStatus = product.stock === 0 ? 'out-of-stock' : product.stock <= 10 ? 'low-stock' : 'in-stock';
      const stockLabel = product.stock === 0 ? 'Out of Stock' : product.stock <= 10 ? 'Low Stock' : 'In Stock';

      return `
        <div class="admin-product-card" data-id="${product.id}">
          <div class="admin-product-image">
            ${product.imageUrl ? `<img src="${product.imageUrl}" alt="${escapeHtml(product.title)}">` : '📦'}
          </div>
          <div class="admin-product-info">
            <div class="admin-product-title">${escapeHtml(product.title)}</div>
            <div class="admin-product-category">${escapeHtml(product.category)}</div>
          </div>
          <div class="admin-product-price">$${parseFloat(product.price).toFixed(2)}</div>
          <div class="admin-product-stock">
            <input type="number" class="stock-input" value="${product.stock}" min="0" 
                   onchange="updateProductStock(${product.id}, this.value)">
            <span class="stock-badge-admin ${stockStatus}">${stockLabel}</span>
          </div>
          <div class="admin-product-actions">
            <button type="button" class="admin-edit-btn" onclick="showEditProductModal(${product.id})">Edit</button>
            <button type="button" class="admin-delete-btn" onclick="deleteProduct(${product.id})">Delete</button>
          </div>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('Error loading admin products:', error);
    container.innerHTML = '<div class="admin-no-orders">Failed to load products</div>';
  }
}
async function loadLoginLogs() {
  const token = getAuthToken();
  if (!token || !isAdmin()) return;

  const container = document.getElementById('adminLoginLogs');
  if (!container) return;

  container.innerHTML = '<div class="admin-loading">Loading login logs...</div>';

  try {
    const response = await fetch('/api/admin/login-logs', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Failed to fetch login logs');

    const { logs } = await response.json();

    if (!logs || logs.length === 0) {
      container.innerHTML = '<div class="admin-no-orders">No login logs found</div>';
      return;
    }

    container.innerHTML = `
      <table class="login-log-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>User</th>
            <th>Discord ID</th>
            <th>Email</th>
            <th>Admin?</th>
            <th>IP</th>
            <th>User Agent</th>
          </tr>
        </thead>
        <tbody>
          ${logs.map(log => `
            <tr>
              <td>${formatDate(log.created_at)}</td>
              <td>
                ${escapeHtml(log.global_name || log.username)}#${escapeHtml(log.discriminator)}
              </td>
              <td>${escapeHtml(log.user_id)}</td>
              <td>${escapeHtml(log.email || '')}</td>
              <td>${log.is_admin ? '✅' : ''}</td>
              <td>${escapeHtml(log.ip_address || '')}</td>
              <td style="max-width:200px;overflow-x:auto;">${escapeHtml(log.user_agent || '')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (error) {
    console.error('Error loading login logs:', error);
    container.innerHTML = '<div class="admin-no-orders">Failed to load login logs</div>';
  }
}

async function updateProductStock(productId, stock) {
  const token = getAuthToken();
  if (!token || !isAdmin()) return;
  
  try {
    const response = await fetch(`/api/admin/products/${productId}/stock`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ stock: parseInt(stock) })
    });
    
    if (!response.ok) throw new Error('Failed to update stock');
    
    showToast('Stock updated successfully');
    loadAdminProducts();
    loadProducts();
    loadAdminStats();
  } catch (error) {
    console.error('Error updating stock:', error);
    showToast('Failed to update stock');
  }
}

function showAddProductModal() {
  showProductModal(null);
}

function showEditProductModal(productId) {
  const product = adminProducts.find(p => p.id === productId);
  if (product) {
    showProductModal(product);
  }
}

function showProductModal(product) {
  const existingModal = document.getElementById('productModal');
  if (existingModal) existingModal.remove();

  const isEdit = product !== null;

  const modal = document.createElement('div');
  modal.id = 'productModal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content product-modal">
      <button type="button" class="modal-close" onclick="closeProductModal()">&times;</button>
      <h2 class="modal-title">${isEdit ? 'Edit Product' : 'Add New Product'}</h2>
      
      <form class="product-form" onsubmit="submitProductForm(event, ${isEdit ? product.id : 'null'})">
        <div class="form-group">
          <label class="form-label">Category</label>
          <select class="form-select" id="productCategory" required>
            <option value="Money" ${product?.category === 'Money' ? 'selected' : ''}>Money</option>
            <option value="Items" ${product?.category === 'Items' ? 'selected' : ''}>Items</option>
            <option value="Bases" ${product?.category === 'Bases' ? 'selected' : ''}>Bases</option>
          </select>
        </div>
        
        <div class="form-group">
          <label class="form-label">Product Title</label>
          <input type="text" class="form-input" id="productTitle" placeholder="e.g., DonutSMP Coins - 1M" 
                 value="${product ? escapeHtml(product.title) : ''}" required>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Price ($)</label>
            <input type="number" class="form-input" id="productPrice" placeholder="0.00" step="0.01" min="0" 
                   value="${product ? product.price : ''}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Old Price ($)</label>
            <input type="number" class="form-input" id="productOldPrice" placeholder="Optional" step="0.01" min="0" 
                   value="${product?.oldPrice || ''}">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Discount Text</label>
            <input type="text" class="form-input" id="productDiscount" placeholder="e.g., -50%" 
                   value="${product?.discount || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Stock</label>
            <input type="number" class="form-input" id="productStock" placeholder="0" min="0" 
                   value="${product ? product.stock : '0'}" required>
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Image URL</label>
          <input type="text" class="form-input" id="productImageUrl" placeholder="e.g., assets/item.png" 
                 value="${product?.imageUrl || ''}">
          <span class="form-hint">Local path (assets/...) or full URL</span>
        </div>
        
        <div class="form-group">
          <label class="form-label">Description</label>
          <input type="text" class="form-input" id="productDescription" placeholder="Instant delivery" 
                 value="${product?.description || 'Instant delivery'}">
        </div>
        
        <button type="submit" class="form-submit-btn" id="productSubmitBtn">
          ${isEdit ? 'Save Changes' : 'Add Product'}
        </button>
      </form>
    </div>
  `;

  document.body.appendChild(modal);
}

function closeProductModal() {
  const modal = document.getElementById('productModal');
  if (modal) {
    modal.classList.add('closing');
    setTimeout(() => modal.remove(), 300);
  }
}

async function submitProductForm(event, productId) {
  event.preventDefault();

  const token = getAuthToken();
  if (!token || !isAdmin()) return;

  const submitBtn = document.getElementById('productSubmitBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
  }

  const productData = {
    category: document.getElementById('productCategory').value,
    title: document.getElementById('productTitle').value,
    price: parseFloat(document.getElementById('productPrice').value),
    oldPrice: document.getElementById('productOldPrice').value || null,
    discount: document.getElementById('productDiscount').value || null,
    stock: parseInt(document.getElementById('productStock').value) || 0,
    imageUrl: document.getElementById('productImageUrl').value || null,
    description: document.getElementById('productDescription').value || 'Instant delivery'
  };

  try {
    const url = productId ? `/api/admin/products/${productId}` : '/api/admin/products';
    const method = productId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(productData)
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to save product');
    }

    showToast(productId ? 'Product updated!' : 'Product created!');
    closeProductModal();
    loadAdminProducts();
    loadProducts();
    loadCategories();
    loadAdminStats();

  } catch (error) {
    console.error('Error saving product:', error);
    showToast(error.message || 'Failed to save product');

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = productId ? 'Save Changes' : 'Add Product';
    }
  }
}

async function deleteProduct(productId) {
  if (!confirm('Are you sure you want to delete this product?')) return;
  
  const token = getAuthToken();
  if (!token || !isAdmin()) return;
  
  try {
    const response = await fetch(`/api/admin/products/${productId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) throw new Error('Failed to delete product');
    
    showToast('Product deleted');
    loadAdminProducts();
    loadProducts();
    loadCategories();
    loadAdminStats();
  } catch (error) {
    console.error('Error deleting product:', error);
    showToast('Failed to delete product');
  }
}

// Product search debounce
let productSearchTimeout;
function debounceProductSearch() {
  clearTimeout(productSearchTimeout);
  productSearchTimeout = setTimeout(loadAdminProducts, 300);
}

// Add event listeners after DOM loads
setTimeout(() => {
  const productSearch = document.getElementById('productSearch');
  const productCategoryFilter = document.getElementById('productCategoryFilter');
  
  if (productSearch) {
    productSearch.addEventListener('input', debounceProductSearch);
  }
  if (productCategoryFilter) {
    productCategoryFilter.addEventListener('change', loadAdminProducts);
  }
}, 1000);

function switchAdminTab(tab) {
  currentAdminTab = tab;
  document.querySelectorAll('.admin-tab').forEach(btn => {
    // Use the tab name to match the button's onclick attribute
    btn.classList.toggle('active', btn.getAttribute('onclick')?.includes(tab));
  });
  document.querySelectorAll('.admin-tab-content').forEach(content => {
    content.classList.remove('active');
  });
  document.getElementById(`${tab}Tab`)?.classList.add('active');

  if (tab === 'products') {
    loadAdminProducts();
  } else if (tab === 'logins') {
    loadLoginLogs();
  } else if (tab === 'schematics') {
    loadAdminSchematics();
  } else {
    loadAdminOrders();
  }
}

async function loadAdminSchematics() {
  const res = await fetch('/api/schematics');
  const data = await res.json();
  const pending = (data.schematics || []).filter(s => !s.approved);
  const uploaded = (data.schematics || []).filter(s => s.approved);

  const pendingList = document.getElementById('adminSchematicsPending');
  const uploadedList = document.getElementById('adminSchematicsUploaded');
  if (pendingList) {
    pendingList.innerHTML = pending.length === 0
      ? '<div class="admin-no-orders">No pending schematics</div>'
      : pending.map(s => `
        <div class="admin-product-card">
          <div>
            <h4>${escapeHtml(s.title)}</h4>
            <p>${escapeHtml(s.description)}</p>
            <p>By: ${s.anonymous ? 'Anonymous' : escapeHtml(s.username || 'Unknown')}</p>
            <button class="admin-add-btn" onclick="approveSchematic('${s.id}')">Approve</button>
          </div>
        </div>
      `).join('');
  }
  if (uploadedList) {
    uploadedList.innerHTML = uploaded.length === 0
      ? '<div class="admin-no-orders">No uploaded schematics</div>'
      : uploaded.map(s => `
        <div class="admin-product-card">
          <div>
            <h4>${escapeHtml(s.title)}</h4>
            <p>${escapeHtml(s.description)}</p>
            <p>By: ${s.anonymous ? 'Anonymous' : escapeHtml(s.username || 'Unknown')}</p>
            <a class="admin-view-btn" href="/api/schematics/${s.id}/download" target="_blank">Download</a>
          </div>
        </div>
      `).join('');
  }
}

async function approveSchematic(id) {
  const token = getAuthToken();
  const res = await fetch(`/api/admin/schematics/${id}/approve`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (res.ok) {
    showToast('Schematic approved!');
    loadAdminSchematics();
  } else {
    showToast('Failed to approve schematic');
  }
}

function showAdminSchematicModal() {
  const existingModal = document.getElementById('adminSchematicModal');
  if (existingModal) existingModal.remove();

  const modal = document.createElement('div');
  modal.id = 'adminSchematicModal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <button type="button" class="modal-close" onclick="document.getElementById('adminSchematicModal').remove()">&times;</button>
      <h2 class="modal-title">Post Schematic</h2>
      <form id="adminSchematicForm">
        <div class="form-group">
          <label class="form-label">Title</label>
          <input type="text" id="adminSchematicTitle" class="form-input" required maxlength="64">
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea id="adminSchematicDescription" class="form-input" required minlength="30" maxlength="500"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">.litematic File</label>
          <input type="file" id="adminSchematicFile" class="form-input" accept=".litematic" required>
        </div>
        <button type="submit" class="form-submit-btn">Post</button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('adminSchematicForm').onsubmit = async function(e) {
    e.preventDefault();
    const file = document.getElementById('adminSchematicFile').files[0];
    const title = document.getElementById('adminSchematicTitle').value.trim();
    const description = document.getElementById('adminSchematicDescription').value.trim();
    if (!file || !file.name.endsWith('.litematic')) {
      showToast('Only .litematic files are allowed.');
      return;
    }
    if (description.length < 30) {
      showToast('Description must be at least 30 characters.');
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('approved', 'true');
    const res = await fetch('/api/admin/schematics', { method: 'POST', body: formData });
    if (res.ok) {
      showToast('Schematic posted!');
      document.getElementById('adminSchematicModal').remove();
      loadAdminSchematics();
    } else {
      showToast('Failed to post schematic');
    }
  };
}

// ============================================
// Schematic helpers (moved outside renderProducts to avoid duplicate declarations)
// ============================================

function showSchematicUploadSuccess() {
  const existingModal = document.getElementById('schematicUploadSuccessModal');
  if (existingModal) existingModal.remove();

  const modal = document.createElement('div');
  modal.id = 'schematicUploadSuccessModal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <button type="button" class="modal-close" onclick="document.getElementById('schematicUploadSuccessModal').remove()">&times;</button>
      <h2 class="modal-title">Schematic Submitted!</h2>
      <p>Your schematic has been submitted for review. If approved, it will be posted to the site for the community to download. Thank you for contributing!</p>
      <button type="button" class="form-submit-btn" onclick="document.getElementById('schematicUploadSuccessModal').remove()">OK</button>
    </div>
  `;
  document.body.appendChild(modal);
}

// Load schematics
async function loadSchematics() {
  try {
    const res = await fetch('/api/schematics');
    const data = await res.json();
    const list = document.getElementById('schematicsList');
    if (!list) return;
    if (!data.schematics || data.schematics.length === 0) {
      list.innerHTML = '<div class="admin-loading">No schematics yet.</div>';
      return;
    }
    const loggedIn = isLoggedIn();
    // Only show approved schematics
    const approvedSchematics = data.schematics.filter(s => s.approved);
    if (approvedSchematics.length === 0) {
      list.innerHTML = '<div class="admin-loading">No schematics yet.</div>';
      return;
    }
    list.innerHTML = approvedSchematics.map(s => `
      <div class="product-card" style="position:relative;">
        <div>
          <h3>${escapeHtml(s.title)}</h3>
          <p>${escapeHtml(s.description)}</p>
          <p>By: ${s.anonymous ? 'Anonymous' : escapeHtml(s.username || 'Unknown')}</p>
          <button type="button" class="add-to-cart-btn" onclick="${loggedIn ? `window.open('/api/schematics/${s.id}/download','_blank')` : 'showLogin()'}">
            ${loggedIn ? 'Download' : 'Login to Download'}
          </button>
          ${!loggedIn ? `<div style="position:absolute;top:0;left:0;width:100%;height:100%;backdrop-filter:blur(4px);background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:2;">
            <button class="add-to-cart-btn" onclick="showLogin()">Login to Download</button>
          </div>` : ''}
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Failed to load schematics:', err);
  }
}
