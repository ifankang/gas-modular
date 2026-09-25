/**
 * 90_ReportService.gs
 * Core Aggregator Service untuk Sistem Laporan Bisnis Komprehensif.
 * 
 * Modul ini menyediakan 5 jenis agregasi laporan bisnis:
 * 1. Kartu Stok (Stock Card): Histori mutasi stok per produk/gudang dengan running balance (Saldo Awal + Masuk - Keluar = Saldo Akhir).
 * 2. Valuasi Aset Stok: Nilai aset inventaris fisik (Qty x cost_price) per gudang dan total konsolidasi.
 * 3. Laporan Pembelian (Purchase Orders): Rekap transaksi pengadaan, status, supplier, dan total nominal.
 * 4. Laporan Penjualan (Sales Orders): Rekap transaksi penjualan, status, pelanggan, dan omzet total.
 * 5. Laporan Pindah Gudang (Stock Transfers): Rekap transfer barang antar-gudang (shipped vs received).
 * 6. Ringkasan Eksekutif (Dashboard KPI / Summary).
 */

const ReportService = {
  /**
   * Helper internal untuk memformat / membandingkan tanggal (YYYY-MM-DD).
   * @param {Date|string} dateVal
   * @returns {string} Format YYYY-MM-DD
   */
  _normalizeDateString: function(dateVal) {
    if (!dateVal) return '';
    if (typeof dateVal === 'string') {
      return dateVal.substring(0, 10);
    }
    if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
      const y = dateVal.getFullYear();
      const m = String(dateVal.getMonth() + 1).padStart(2, '0');
      const d = String(dateVal.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return '';
  },

  /**
   * 1. LAPORAN KARTU STOK (Stock Card Ledger with Running Balance)
   * Mengambil riwayat mutasi stok dengan saldo awal, mutasi masuk/keluar, dan saldo akhir.
   * 
   * @param {Object} params { from_date, to_date, warehouse_id, product_id }
   * @returns {Object} { opening_balance, total_in, total_out, closing_balance, entries: [...] }
   */
  getStockCardReport: function(params) {
    params = params || {};
    const fromDate = params.from_date ? this._normalizeDateString(params.from_date) : '';
    const toDate = params.to_date ? this._normalizeDateString(params.to_date) : '';
    const warehouseId = params.warehouse_id || '';
    const productId = params.product_id || '';

    // Ambil seluruh mutasi stok
    const allMutations = Database.findAll('StockMutations');
    const allProducts = Database.findAll('Products');
    const allWarehouses = Database.findAll('Warehouses');

    const productMap = {};
    allProducts.forEach(p => { productMap[p.id] = p; });
    const warehouseMap = {};
    allWarehouses.forEach(w => { warehouseMap[w.id] = w; });

    // Urutkan mutasi secara kronologis (terlama ke terbaru)
    allMutations.sort((a, b) => {
      const da = new Date(a.date || a.created_at || 0).getTime();
      const db = new Date(b.date || b.created_at || 0).getTime();
      return da - db;
    });

    let openingBalance = 0;
    let totalIn = 0;
    let totalOut = 0;
    const entries = [];

    allMutations.forEach(m => {
      // Filter per produk dan gudang jika ditentukan
      if (productId && m.product_id !== productId) return;
      if (warehouseId && m.warehouse_id !== warehouseId) return;

      const mDate = this._normalizeDateString(m.date || m.created_at);
      const qty = Number(m.quantity) || 0;
      const isPositive = (m.type === 'IN' || m.type === 'TRANSFER_IN');
      const isNegative = (m.type === 'OUT' || m.type === 'TRANSFER_OUT');
      const change = isPositive ? qty : (isNegative ? -qty : 0);

      // Jika ada filter fromDate dan mutasi terjadi SEBELUM fromDate -> masuk ke Opening Balance
      if (fromDate && mDate < fromDate) {
        openingBalance += change;
        return;
      }

      // Jika ada filter toDate dan mutasi terjadi SETELAH toDate -> abaikan
      if (toDate && mDate > toDate) {
        return;
      }

      // Masuk dalam periode laporan
      if (isPositive) totalIn += qty;
      if (isNegative) totalOut += qty;

      entries.push({
        id: m.id,
        date: mDate,
        type: m.type,
        reference_type: m.reference_type || '-',
        reference_id: m.reference_id || '-',
        warehouse_id: m.warehouse_id,
        warehouse_name: warehouseMap[m.warehouse_id] ? warehouseMap[m.warehouse_id].name : m.warehouse_id,
        product_id: m.product_id,
        product_name: productMap[m.product_id] ? productMap[m.product_id].name : m.product_id,
        product_code: productMap[m.product_id] ? productMap[m.product_id].code : '',
        unit: productMap[m.product_id] ? (productMap[m.product_id].unit || 'pcs') : 'pcs',
        qty_in: isPositive ? qty : 0,
        qty_out: isNegative ? qty : 0,
        notes: m.notes || '',
        created_by: m.created_by || ''
      });
    });

    // Hitung running balance pada setiap baris entry
    let running = openingBalance;
    entries.forEach(e => {
      running += (e.qty_in - e.qty_out);
      e.balance = running;
    });

    return {
      opening_balance: openingBalance,
      total_in: totalIn,
      total_out: totalOut,
      closing_balance: running,
      entries: entries
    };
  },

  /**
   * 2. LAPORAN VALUASI ASET STOK (Stock Valuation per Warehouse & Company Total)
   * Menghitung nilai aset inventaris = Kuantitas Fisik x Harga Modal (cost_price).
   * 
   * @param {Object} params { warehouse_id, category_id }
   * @returns {Object} { total_quantity, total_valuation, warehouses_breakdown: [...], items: [...] }
   */
  getStockValuationReport: function(params) {
    params = params || {};
    const warehouseId = params.warehouse_id || '';
    const categoryId = params.category_id || '';

    const allStocks = Database.findAll('Stocks');
    const allProducts = Database.findAll('Products');
    const allWarehouses = Database.findAll('Warehouses');
    const allCategories = Database.findAll('Categories');

    const productMap = {};
    allProducts.forEach(p => { productMap[p.id] = p; });
    const warehouseMap = {};
    allWarehouses.forEach(w => { warehouseMap[w.id] = w; });
    const categoryMap = {};
    allCategories.forEach(c => { categoryMap[c.id] = c; });

    let totalQuantity = 0;
    let totalValuation = 0;
    const warehouseTotals = {};
    const items = [];

    allStocks.forEach(stk => {
      if (warehouseId && stk.warehouse_id !== warehouseId) return;

      const product = productMap[stk.product_id];
      if (!product) return;
      if (categoryId && product.category_id !== categoryId) return;

      const qty = Number(stk.quantity) || 0;
      const costPrice = Number(product.cost_price) || 0;
      const sellingPrice = Number(product.price) || 0;
      const valuation = qty * costPrice;
      const potentialRevenue = qty * sellingPrice;

      totalQuantity += qty;
      totalValuation += valuation;

      const wId = stk.warehouse_id || 'UNKNOWN';
      const wName = warehouseMap[wId] ? warehouseMap[wId].name : wId;
      if (!warehouseTotals[wId]) {
        warehouseTotals[wId] = {
          warehouse_id: wId,
          warehouse_name: wName,
          total_qty: 0,
          total_valuation: 0
        };
      }
      warehouseTotals[wId].total_qty += qty;
      warehouseTotals[wId].total_valuation += valuation;

      items.push({
        id: stk.id,
        warehouse_id: stk.warehouse_id,
        warehouse_name: wName,
        product_id: product.id,
        product_code: product.code || '',
        product_name: product.name,
        category_name: categoryMap[product.category_id] ? categoryMap[product.category_id].name : (product.category_id || '-'),
        quantity: qty,
        unit: product.unit || 'pcs',
        cost_price: costPrice,
        selling_price: sellingPrice,
        valuation: valuation,
        potential_revenue: potentialRevenue
      });
    });

    // Urutkan item berdasarkan valuasi terbesar
    items.sort((a, b) => b.valuation - a.valuation);

    return {
      total_quantity: totalQuantity,
      total_valuation: totalValuation,
      warehouse_breakdown: Object.values(warehouseTotals),
      items: items
    };
  },

  /**
   * 3. LAPORAN PEMBELIAN / PURCHASE ORDERS
   * @param {Object} params { from_date, to_date, status, warehouse_id, supplier }
   * @returns {Object} { total_orders, total_amount, orders: [...] }
   */
  getPurchaseReport: function(params) {
    params = params || {};
    const fromDate = params.from_date ? this._normalizeDateString(params.from_date) : '';
    const toDate = params.to_date ? this._normalizeDateString(params.to_date) : '';
    const status = params.status || '';
    const warehouseId = params.warehouse_id || '';
    const supplier = (params.supplier || '').toLowerCase();

    const allOrders = Database.findAll('Orders');
    const allWarehouses = Database.findAll('Warehouses');
    const warehouseMap = {};
    allWarehouses.forEach(w => { warehouseMap[w.id] = w; });

    let totalAmount = 0;
    const orders = [];

    allOrders.forEach(o => {
      if (o.type !== 'PURCHASE') return;

      const oDate = this._normalizeDateString(o.date || o.created_at);
      if (fromDate && oDate < fromDate) return;
      if (toDate && oDate > toDate) return;
      if (status && o.status !== status) return;
      if (warehouseId && o.destination_warehouse_id !== warehouseId) return;
      if (supplier && !(o.contact_name || '').toLowerCase().includes(supplier)) return;

      const amount = Number(o.total_amount) || 0;
      totalAmount += amount;

      orders.push({
        id: o.id,
        order_no: o.order_no,
        date: oDate,
        supplier: o.contact_name,
        warehouse_id: o.destination_warehouse_id,
        warehouse_name: warehouseMap[o.destination_warehouse_id] ? warehouseMap[o.destination_warehouse_id].name : o.destination_warehouse_id,
        total_amount: amount,
        status: o.status,
        approved_by: o.approved_by || '-',
        received_by: o.received_by || '-',
        created_at: o.created_at
      });
    });

    // Urutkan tanggal terbaru ke terlama
    orders.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    return {
      total_orders: orders.length,
      total_amount: totalAmount,
      orders: orders
    };
  },

  /**
   * 4. LAPORAN PENJUALAN / SALES ORDERS
   * @param {Object} params { from_date, to_date, status, warehouse_id, customer }
   * @returns {Object} { total_orders, total_amount, orders: [...] }
   */
  getSalesReport: function(params) {
    params = params || {};
    const fromDate = params.from_date ? this._normalizeDateString(params.from_date) : '';
    const toDate = params.to_date ? this._normalizeDateString(params.to_date) : '';
    const status = params.status || '';
    const warehouseId = params.warehouse_id || '';
    const customer = (params.customer || '').toLowerCase();

    const allOrders = Database.findAll('Orders');
    const allWarehouses = Database.findAll('Warehouses');
    const warehouseMap = {};
    allWarehouses.forEach(w => { warehouseMap[w.id] = w; });

    let totalAmount = 0;
    const orders = [];

    allOrders.forEach(o => {
      if (o.type !== 'SALES') return;

      const oDate = this._normalizeDateString(o.date || o.created_at);
      if (fromDate && oDate < fromDate) return;
      if (toDate && oDate > toDate) return;
      if (status && o.status !== status) return;
      if (warehouseId && o.destination_warehouse_id !== warehouseId) return;
      if (customer && !(o.contact_name || '').toLowerCase().includes(customer)) return;

      const amount = Number(o.total_amount) || 0;
      totalAmount += amount;

      orders.push({
        id: o.id,
        order_no: o.order_no,
        date: oDate,
        customer: o.contact_name,
        warehouse_id: o.destination_warehouse_id,
        warehouse_name: warehouseMap[o.destination_warehouse_id] ? warehouseMap[o.destination_warehouse_id].name : o.destination_warehouse_id,
        total_amount: amount,
        status: o.status,
        created_at: o.created_at
      });
    });

    // Urutkan tanggal terbaru ke terlama
    orders.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    return {
      total_orders: orders.length,
      total_amount: totalAmount,
      orders: orders
    };
  },

  /**
   * 5. LAPORAN PINDAH GUDANG / STOCK TRANSFERS
   * @param {Object} params { from_date, to_date, status, source_warehouse_id, destination_warehouse_id }
   * @returns {Object} { total_transfers, transfers: [...] }
   */
  getTransferReport: function(params) {
    params = params || {};
    const fromDate = params.from_date ? this._normalizeDateString(params.from_date) : '';
    const toDate = params.to_date ? this._normalizeDateString(params.to_date) : '';
    const status = params.status || '';
    const sourceWarehouseId = params.source_warehouse_id || '';
    const destWarehouseId = params.destination_warehouse_id || '';

    const allTransfers = Database.findAll('StockTransfers');
    const allWarehouses = Database.findAll('Warehouses');
    const warehouseMap = {};
    allWarehouses.forEach(w => { warehouseMap[w.id] = w; });

    const transfers = [];

    allTransfers.forEach(t => {
      const tDate = this._normalizeDateString(t.date || t.created_at);
      if (fromDate && tDate < fromDate) return;
      if (toDate && tDate > toDate) return;
      if (status && t.status !== status) return;
      if (sourceWarehouseId && t.source_warehouse_id !== sourceWarehouseId) return;
      if (destWarehouseId && t.destination_warehouse_id !== destWarehouseId) return;

      transfers.push({
        id: t.id,
        transfer_no: t.transfer_no,
        date: tDate,
        source_warehouse_id: t.source_warehouse_id,
        source_warehouse_name: warehouseMap[t.source_warehouse_id] ? warehouseMap[t.source_warehouse_id].name : t.source_warehouse_id,
        destination_warehouse_id: t.destination_warehouse_id,
        destination_warehouse_name: warehouseMap[t.destination_warehouse_id] ? warehouseMap[t.destination_warehouse_id].name : t.destination_warehouse_id,
        status: t.status,
        approved_by: t.approved_by || '-',
        received_by: t.received_by || '-',
        notes: t.notes || '',
        created_at: t.created_at
      });
    });

    transfers.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    return {
      total_transfers: transfers.length,
      transfers: transfers
    };
  },

  /**
   * 6. RINGKASAN EKSEKUTIF / DASHBOARD METRICS
   * Menghitung KPI kunci secara menyeluruh dengan Caching RAM cerdas (TTL 15 Menit).
   * Mencegah kalkulasi ribuan baris berulang-ulang untuk menghemat kuota GAS.
   * @returns {Object}
   */
  getExecutiveSummary: function() {
    const CACHE_KEY = 'REPORT_KPI_EXECUTIVE_SUMMARY';
    try {
      const cache = CacheService.getScriptCache();
      const cached = cache.get(CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      Logger.log("KPI cache get error: " + e.message);
    }

    const valuation = this.getStockValuationReport({});
    const purchases = this.getPurchaseReport({});
    const sales = this.getSalesReport({});
    const transfers = this.getTransferReport({});

    const summaryData = {
      total_inventory_items: valuation.total_quantity,
      total_inventory_valuation: valuation.total_valuation,
      total_purchase_amount: purchases.total_amount,
      total_sales_amount: sales.total_amount,
      total_purchase_orders: purchases.total_orders,
      total_sales_orders: sales.total_orders,
      total_transfers: transfers.total_transfers,
      warehouse_breakdown: valuation.warehouse_breakdown,
      cached_at: new Date().toISOString()
    };

    try {
      const cache = CacheService.getScriptCache();
      // Cache selama 15 menit (900 detik)
      cache.put(CACHE_KEY, JSON.stringify(summaryData), 900);
    } catch (e) {
      Logger.log("KPI cache put error: " + e.message);
    }

    return summaryData;
  },

  /**
   * 7. DASHBOARD ACTIONABLE INSIGHTS & IN/OUT EQUILIBRIUM
   * Menghitung keseimbangan arus masuk vs keluar (Qty & Value), peringatan actionable,
   * dan ranking performa gudang, produk, serta sales dalam satu siklus (single-pass).
   *
   * @param {Object} options { days: number } Default 30 hari (0 = semua waktu)
   * @returns {Object}
   */
  getDashboardInsights: function(options) {
    options = options || {};
    const days = typeof options.days === 'number' ? options.days : 30;
    const CACHE_KEY = 'DASHBOARD_INSIGHTS_DAYS_' + days;

    try {
      const cache = CacheService.getScriptCache();
      const cached = cache.get(CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      Logger.log("Dashboard insights cache get error: " + e.message);
    }

    // Ambil data sheet melalui Database (otomatis menggunakan RAM Cache)
    const allMutations = Database.findAll('StockMutations') || [];
    const allOrders = Database.findAll('Orders') || [];
    const allOrderItems = Database.findAll('OrderItems') || [];
    const allProducts = Database.findAll('Products') || [];
    const allWarehouses = Database.findAll('Warehouses') || [];
    const allUsers = Database.findAll('Users') || [];
    const allStocks = Database.findAll('Stocks') || [];

    // Map lookup untuk kecepatan O(1)
    const productMap = {};
    allProducts.forEach(p => { productMap[p.id] = p; });

    const warehouseMap = {};
    allWarehouses.forEach(w => { warehouseMap[w.id] = w; });

    const userMap = {};
    allUsers.forEach(u => {
      userMap[u.id] = u;
      if (u.name) userMap[u.name] = u;
      if (u.email) userMap[u.email] = u;
    });

    // Hitung tanggal cutoff jika days > 0
    let cutoffTime = 0;
    if (days > 0) {
      const d = new Date();
      d.setDate(d.getDate() - days);
      d.setHours(0, 0, 0, 0);
      cutoffTime = d.getTime();
    }

    // 1. IN vs OUT EQUILIBRIUM (Qty & Value)
    let inQty = 0;
    let outQty = 0;
    let inValue = 0;   // Modal Beli (Qty * cost_price)
    let outValue = 0;  // Nilai Jual / Omzet (Qty * price)

    // Agregasi Performa
    const warehouseStats = {};
    allWarehouses.forEach(w => {
      warehouseStats[w.id] = {
        id: w.id,
        name: w.name || w.id,
        code: w.code || w.id,
        in_qty: 0,
        out_qty: 0,
        out_value: 0,
        low_stock_count: 0
      };
    });

    const productSalesStats = {};
    allProducts.forEach(p => {
      productSalesStats[p.id] = {
        id: p.id,
        code: p.code || p.id,
        name: p.name || p.id,
        sold_qty: 0,
        revenue: 0,
        current_stock: Number(p.stock) || 0,
        cost_price: Number(p.cost_price) || 0,
        price: Number(p.price) || 0,
        last_mutation_time: 0
      };
    });

    // Iterasi mutasi stok (Single-Pass)
    allMutations.forEach(m => {
      const mutTime = new Date(m.date || m.created_at || 0).getTime();
      const p = productMap[m.product_id];
      const costPrice = p ? (Number(p.cost_price) || 0) : 0;
      const sellingPrice = p ? (Number(p.price) || 0) : 0;
      const qty = Number(m.quantity) || 0;
      const type = String(m.type || '').toUpperCase();

      // Catat mutasi terakhir per produk untuk deteksi dead-stock
      if (productSalesStats[m.product_id] && mutTime > productSalesStats[m.product_id].last_mutation_time) {
        productSalesStats[m.product_id].last_mutation_time = mutTime;
      }

      // Filter periode
      if (cutoffTime > 0 && mutTime < cutoffTime) {
        return;
      }

      // Hitung arus IN vs OUT murni (abaikan transfer internal agar net tidak bias)
      if (type === 'IN') {
        inQty += qty;
        inValue += (qty * costPrice);
        if (warehouseStats[m.warehouse_id]) {
          warehouseStats[m.warehouse_id].in_qty += qty;
        }
      } else if (type === 'OUT') {
        outQty += qty;
        outValue += (qty * sellingPrice);
        if (warehouseStats[m.warehouse_id]) {
          warehouseStats[m.warehouse_id].out_qty += qty;
          warehouseStats[m.warehouse_id].out_value += (qty * sellingPrice);
        }
        if (productSalesStats[m.product_id]) {
          productSalesStats[m.product_id].sold_qty += qty;
          productSalesStats[m.product_id].revenue += (qty * sellingPrice);
        }
      }
    });

    // 2. AGREGASI SALES / STAFF DARI ORDERS
    const salesUserStats = {};
    let pendingOrdersCount = 0;
    let pendingOrdersAmount = 0;
    const pendingOrdersList = [];

    allOrders.forEach(o => {
      const orderTime = new Date(o.date || o.created_at || 0).getTime();
      const status = String(o.status || '').toLowerCase();
      const type = String(o.type || '').toUpperCase();
      const totalAmt = Number(o.total_amount) || 0;

      // Cek pesanan tertahan (pending)
      if (status === 'pending' || status === 'draft') {
        pendingOrdersCount++;
        pendingOrdersAmount += totalAmt;
        if (pendingOrdersList.length < 5) {
          pendingOrdersList.push({
            id: o.id,
            order_no: o.order_no || o.id,
            type: o.type,
            contact_name: o.contact_name,
            total_amount: totalAmt,
            date: o.date || o.created_at
          });
        }
      }

      // Filter periode untuk performa sales
      if (cutoffTime > 0 && orderTime < cutoffTime) {
        return;
      }

      // Hitung pesanan penjualan (SALES) yang disetujui/selesai
      if (type === 'SALES' && (status === 'approved' || status === 'received' || status === 'completed')) {
        const creator = o.created_by || o.approved_by || 'Staff';
        if (!salesUserStats[creator]) {
          salesUserStats[creator] = {
            name: userMap[creator] ? (userMap[creator].name || creator) : creator,
            order_count: 0,
            total_revenue: 0
          };
        }
        salesUserStats[creator].order_count++;
        salesUserStats[creator].total_revenue += totalAmt;
      }
    });

    // 3. CEK LOW STOCK & DEAD STOCK
    const lowStockAlerts = [];
    const deadStockAlerts = [];
    const nowTime = new Date().getTime();
    const thirtyDaysAgo = nowTime - (30 * 24 * 60 * 60 * 1000);

    // Ambil stok real dari Stocks table jika tersedia, atau fallback ke Products.stock
    const currentStockByProduct = {};
    allStocks.forEach(s => {
      const q = Number(s.quantity) || 0;
      currentStockByProduct[s.product_id] = (currentStockByProduct[s.product_id] || 0) + q;
      if (q <= 5 && warehouseStats[s.warehouse_id]) {
        warehouseStats[s.warehouse_id].low_stock_count++;
      }
    });

    allProducts.forEach(p => {
      const stock = currentStockByProduct[p.id] !== undefined ? currentStockByProduct[p.id] : (Number(p.stock) || 0);
      const stats = productSalesStats[p.id];

      // Peringatan stok kritis (<= 5)
      if (stock <= 5) {
        lowStockAlerts.push({
          id: p.id,
          code: p.code || p.id,
          name: p.name || p.id,
          stock: stock,
          unit: p.unit || 'pcs',
          price: Number(p.price) || 0
        });
      }

      // Deteksi dead stock: ada stok (> 5 pcs) tapi tidak ada mutasi/penjualan dalam 30 hari terakhir
      if (stock > 5) {
        const lastActivity = stats ? stats.last_mutation_time : 0;
        if (lastActivity === 0 || lastActivity < thirtyDaysAgo) {
          const daysInactive = lastActivity === 0 ? 60 : Math.round((nowTime - lastActivity) / (24 * 60 * 60 * 1000));
          deadStockAlerts.push({
            id: p.id,
            code: p.code || p.id,
            name: p.name || p.id,
            stock: stock,
            cost_price: Number(p.cost_price) || 0,
            tied_capital: stock * (Number(p.cost_price) || 0),
            days_inactive: daysInactive
          });
        }
      }
    });

    // Urutkan peringatan
    lowStockAlerts.sort((a, b) => a.stock - b.stock);
    deadStockAlerts.sort((a, b) => b.tied_capital - a.tied_capital);

    // 4. RANKING PERFORMERS
    // Top Products
    const productStatsArr = Object.values(productSalesStats);
    productStatsArr.sort((a, b) => b.sold_qty - a.sold_qty);

    const topProducts = productStatsArr.filter(p => p.sold_qty > 0).slice(0, 5);
    const bottomProducts = productStatsArr
      .filter(p => p.current_stock > 0)
      .sort((a, b) => a.sold_qty - b.sold_qty)
      .slice(0, 5);

    // Warehouses
    const warehouseArr = Object.values(warehouseStats);
    warehouseArr.sort((a, b) => b.out_value - a.out_value);
    const topWarehouses = warehouseArr.slice(0, 5);
    const bottomWarehouses = [...warehouseArr].sort((a, b) => (a.out_qty + a.in_qty) - (b.out_qty + b.in_qty)).slice(0, 5);

    // Sales Staff
    const salesArr = Object.values(salesUserStats);
    salesArr.sort((a, b) => b.total_revenue - a.total_revenue);
    const topSales = salesArr.slice(0, 5);

    // 5. STATUS EQUILIBRIUM & CASHFLOW
    const totalVolume = inQty + outQty;
    const inQtyRatio = totalVolume > 0 ? Math.round((inQty / totalVolume) * 100) : 50;
    const outQtyRatio = totalVolume > 0 ? (100 - inQtyRatio) : 50;

    const netQtyDelta = inQty - outQty;
    const netValueFlow = outValue - inValue; // Omzet keluar dikurang modal pembelian masuk

    let equilibriumStatus = 'BALANCED'; // BALANCED, OVERSTOCK_RISK, DEPLETION_RISK
    let statusLabel = 'Sehat & Berimbang';
    let statusColor = 'emerald';

    if (inQty > 0 && outQty === 0) {
      equilibriumStatus = 'ACCUMULATING';
      statusLabel = 'Akumulasi Stok (Belum Ada Penjualan)';
      statusColor = 'amber';
    } else if (inQty > (outQty * 1.6) && inQty > 20) {
      equilibriumStatus = 'OVERSTOCK_RISK';
      statusLabel = 'Pemasukan Tinggi (Waspada Overstock & Kas Mandek)';
      statusColor = 'amber';
    } else if (outQty > (inQty * 1.6) && outQty > 20) {
      equilibriumStatus = 'DEPLETION_RISK';
      statusLabel = 'Pengeluaran Cepat (Waspada Kehabisan Stok / Perlu Restock)';
      statusColor = 'rose';
    }

    const payload = {
      period_days: days,
      equilibrium: {
        in_qty: inQty,
        out_qty: outQty,
        in_value: inValue,
        out_value: outValue,
        net_qty: netQtyDelta,
        net_value: netValueFlow,
        in_ratio: inQtyRatio,
        out_ratio: outQtyRatio,
        status: equilibriumStatus,
        status_label: statusLabel,
        status_color: statusColor
      },
      alerts: {
        low_stock: {
          total: lowStockAlerts.length,
          items: lowStockAlerts.slice(0, 6)
        },
        pending_orders: {
          total: pendingOrdersCount,
          amount: pendingOrdersAmount,
          items: pendingOrdersList
        },
        dead_stock: {
          total: deadStockAlerts.length,
          items: deadStockAlerts.slice(0, 6)
        }
      },
      performers: {
        top_products: topProducts,
        bottom_products: bottomProducts,
        top_warehouses: topWarehouses,
        bottom_warehouses: bottomWarehouses,
        top_sales: topSales
      },
      generated_at: new Date().toISOString()
    };

    // Cache selama 5 menit (300 detik)
    try {
      const cache = CacheService.getScriptCache();
      cache.put(CACHE_KEY, JSON.stringify(payload), 300);
    } catch (e) {
      Logger.log("Dashboard insights cache put error: " + e.message);
    }

    return payload;
  },

  /**
   * Invalidasi manual atau otomatis saat ada mutasi transaksi / stok.
   */
  invalidateSummaryCache: function() {
    try {
      const cache = CacheService.getScriptCache();
      cache.remove('REPORT_KPI_EXECUTIVE_SUMMARY');
      cache.remove('DASHBOARD_INSIGHTS_DAYS_7');
      cache.remove('DASHBOARD_INSIGHTS_DAYS_30');
      cache.remove('DASHBOARD_INSIGHTS_DAYS_90');
      cache.remove('DASHBOARD_INSIGHTS_DAYS_0');
    } catch (e) {
      Logger.log("KPI cache invalidate error: " + e.message);
    }
  }
};
