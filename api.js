// =====================================================================
// SPPG — lapisan data Supabase. Menggantikan google.script.run (gasRun).
// Sesi disimpan di memori saja: tidak ada perangkat/aktivitas yang ditautkan di server.
// =====================================================================
(function () {
  const cfgOk = typeof SUPABASE_URL !== 'undefined' && !/ISI-PROJECT|ISI_/.test(SUPABASE_URL + SUPABASE_ANON_KEY);
  const sb = cfgOk ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false }
  }) : null;

  const need = () => { if (!sb) throw new Error('Konfigurasi belum diisi. Buka config.js lalu isi SUPABASE_URL dan SUPABASE_ANON_KEY.'); return sb; };
  const ok = (r) => { if (r.error) throw new Error(r.error.message || String(r.error)); return r.data; };
  const rpc = async (fn, args) => ok(await need().rpc(fn, args || {}));
  const num = (v) => Number(v) || 0;
  const ms = (iso) => iso ? new Date(iso).getTime() : 0;

  const WS_KEY = 'sppg_ws';
  const getWs = () => { try { return localStorage.getItem(WS_KEY) || ''; } catch (e) { return window.__ws || ''; } };
  const setWs = (k) => { try { localStorage.setItem(WS_KEY, k); } catch (e) { window.__ws = k; } };
  // Tautan aktivasi: ?lisensi=KODE&ws=KODEWORKSPACE
  try { const q = new URLSearchParams(location.search); if (q.get('ws')) setWs(q.get('ws').toUpperCase()); } catch (e) {}

  let me = null; // { role, nama }
  async function loadMe() {
    const { data: u } = await need().auth.getUser();
    if (!u || !u.user) { me = null; return null; }
    const r = await need().from('profiles').select('role,nama').eq('id', u.user.id).maybeSingle();
    me = r.data || null; return me;
  }

  async function invoke(name, body) {
    const { data } = await need().auth.getSession();
    const token = data && data.session ? data.session.access_token : '';
    const res = await fetch(SUPABASE_URL + '/functions/v1/' + name, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token },
      body: JSON.stringify(body || {})
    });
    let j = {}; try { j = await res.json(); } catch (e) {}
    if (!res.ok || j.success === false) { const err = new Error(j.message || ('Gagal (' + res.status + ')')); err.payload = j; throw err; }
    return j;
  }

  async function fetchAll(table, order) {
    const out = []; const size = 1000;
    for (let from = 0; ; from += size) {
      const r = ok(await need().from(table).select('*').order(order, { ascending: true }).range(from, from + size - 1));
      out.push(...r); if (r.length < size) break;
    }
    return out;
  }

  
  const API = {
    // ---------- DATA ----------
    async getData() {
      const [p, t, o] = await Promise.all([fetchAll('products', 'created_at'), fetchAll('transactions', 'created_at'), fetchAll('tray_records', 'created_at')]);
      const code = {}; p.forEach(x => code[x.id] = x.code);
      return {
        products: p.map(x => ({ id: x.id, code: x.code, name: x.name, category: x.category, unit: x.unit, minStock: num(x.min_stock), price: num(x.price) })),
        transactions: t.map(x => ({ id: x.id, timestamp: ms(x.created_at), user: x.user_name, type: x.type, date: x.date, ref: x.ref,
          productId: x.product_id, qty: num(x.qty), price: num(x.price), total: num(x.total), note: x.note || '', photoUrl: '',
          expired: x.expired || '', supplier: x.supplier || '', productCode: code[x.product_id] || '' })),
        trayWaste: o.map(x => ({ id: x.id, timestamp: ms(x.created_at), user: x.user_name, date: x.date, status: x.status, type: x.name,
          qty: num(x.qty), price: num(x.price), total: num(x.total), note: x.note || '' }))
      };
    },
    async saveProduct(d) {
      const row = { code: String(d.code).trim(), name: d.name, category: d.category, unit: d.unit, min_stock: num(d.minStock), price: num(d.price) };
      if (d.id) { ok(await need().from('products').update(row).eq('id', d.id)); return { success: true, id: d.id }; }
      if (!me) await loadMe();
      const w = await need().from('profiles').select('workspace_id').eq('id', (await need().auth.getUser()).data.user.id).single();
      const r = await need().from('products').insert({ ...row, workspace_id: w.data.workspace_id }).select('id').single();
      if (r.error) throw new Error(/products_code|duplicate/i.test(r.error.message) ? 'Kode barang sudah ada!' : r.error.message);
      return { success: true, id: r.data.id };
    },
    async deleteProduct(id) {
      const r = await need().from('products').delete().eq('id', id);
      if (r.error) throw new Error(/foreign key|violates/i.test(r.error.message) ? 'Barang tidak dapat dihapus karena memiliki riwayat transaksi.' : r.error.message);
      return { success: true };
    },
    saveTransaction(trx) { return rpc('save_transaction', { p: trx }); },
    saveOpnameCorrection(trx) { return rpc('save_transaction', { p: { ...trx, type: 'CORRECTION' } }); },
    async deleteTransaction(id) { ok(await need().from('transactions').delete().eq('id', id)); return { success: true }; },
    resetAllTransactions() { return rpc('reset_all_transactions'); },
    async saveOmprengUtuh(d) {
      if (!d || !d.date) throw new Error('Tanggal wajib diisi.');
      if (!d.status || !d.type) throw new Error('Status dan nama bahan wajib diisi.');
      const qty = num(d.qty), price = num(d.price);
      if (qty <= 0) throw new Error('Jumlah harus lebih dari 0.');
      if (price < 0) throw new Error('Harga tidak valid.');
      const w = await need().from('profiles').select('workspace_id,role').eq('id', (await need().auth.getUser()).data.user.id).single();
      const r = await need().from('tray_records').insert({ workspace_id: w.data.workspace_id, status: d.status, name: d.type, qty, price,
        total: num(d.total) || qty * price, note: d.note || '', date: d.date, user_name: w.data.role }).select('id').single();
      ok(r); return { success: true, id: r.data.id };
    },

    // ---------- LISENSI & INFO PUBLIK ----------
    verifyLicenseCode(code) { return rpc('verify_license', { p_code: code }); },
    async getAppName() { const s = await API._settings(); return s.appName || 'SPPG'; },
    async getPublicTimestampLabel() { const s = await API._settings(); return s.timestampLabel || ''; },
    async getLicenseWhatsappNumber() { const s = await API._settings(); return s.waNumber || ''; },
    async _settings() {
      if (!sb) return {};
      const { data } = await sb.auth.getSession();
      if (data && data.session) return (await rpc('my_settings')) || {};
      const k = getWs(); return k ? ((await rpc('public_workspace_info', { p_kode: k })) || {}) : {};
    },
    async getConnectionSettings() { return rpc('my_settings'); },
    async setAppName(n) { return rpc('set_app_name', { p_name: n }); },
    async setWhatsappNumber(n) { return rpc('set_wa_number', { p_num: n }); },
    async setCustomTimestampLabel(l) { return rpc('set_timestamp_label', { p_label: l }); },

    // ---------- AUTH ADMIN (Email OTP) ----------
    async getBootstrapInfo() { return { needsSetup: false }; },
    async sendSignupOtp(email, nama) {
      if (!String(nama || '').trim()) return { success: false, message: 'Nama wajib diisi.' };
      const { error } = await need().auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
      return error ? { success: false, message: error.message } : { success: true };
    },
    async verifySignupOtpAndCreateAdmin(email, otp, nama, password) {
      const v = await need().auth.verifyOtp({ email: email.trim(), token: otp.trim(), type: 'email' });
      if (v.error) return { success: false, message: 'Kode OTP salah atau kedaluwarsa.' };
      if (String(password || '').length < 6) { await need().auth.signOut(); return { success: false, message: 'Password minimal 6 karakter.' }; }
      const up = await need().auth.updateUser({ password });
      if (up.error) { await need().auth.signOut(); return { success: false, message: up.error.message }; }
      try { await invoke('create-admin-workspace', { nama }); } catch (e) { await need().auth.signOut(); return { success: false, message: e.message }; }
      const m = await loadMe();
      return { success: true, token: 'sb', adminName: m ? m.nama : nama, message: 'Berhasil. Selanjutnya masuk cukup dengan email + password.' };
    },
    async verifyAdminPassword(email, password) { // login Admin: email + password, tanpa OTP
      const r = await need().auth.signInWithPassword({ email: String(email || '').trim(), password: String(password || '') });
      if (r.error) return { success: false, message: 'Email atau password salah' };
      const m = await loadMe();
      if (!m || m.role !== 'ADMIN') { await need().auth.signOut(); return { success: false, message: 'Email ini belum punya workspace Admin. Gunakan "Daftar Admin baru".' }; }
      return { success: true, token: 'sb', adminName: m.nama };
    },

    // ---------- AUTH OPERATOR ----------
    async listOperatorNames(kode) { kode = kode || getWs(); return kode ? ((await rpc('list_operator_names', { p_kode: kode })) || []) : []; },
    async verifyOperatorPassword(kode, name, pw) {
      kode = String(kode || '').trim().toUpperCase();
      if (!kode) return { success: false, message: 'Kode Workspace wajib diisi.' };
      const email = await rpc('operator_login_email', { p_kode: kode, p_nama: name });
      if (!email) return { success: false, message: 'Nama atau password operator salah' };
      const { error } = await need().auth.signInWithPassword({ email, password: pw });
      if (error) return { success: false, message: 'Nama atau password operator salah' };
      const m = await loadMe();
      if (!m || m.role !== 'OPERATOR') { await need().auth.signOut(); return { success: false, message: 'Akun tidak valid.' }; }
      setWs(kode);
      return { success: true, token: 'sb', operatorName: m.nama };
    },
    async logout() { me = null; if (sb) await sb.auth.signOut(); },

    // ---------- KELOLA OPERATOR ----------
    async listOperators() {
      const r = ok(await need().from('profiles').select('id,nama,created_at').eq('role', 'OPERATOR').order('created_at'));
      return r.map(x => ({ id: x.id, nama: x.nama, status: 'AKTIF', createdAt: x.created_at }));
    },
    createOperator(name, pw, confirm) {
      if (pw !== confirm) throw new Error('Konfirmasi password tidak sama.');
      return invoke('create-operator', { action: 'create', name, password: pw, origin: location.origin });
    },
    updateOperatorPassword(name, pw, confirm) {
      if (pw !== confirm) throw new Error('Konfirmasi password tidak sama.');
      return invoke('create-operator', { action: 'reset', name, password: pw, origin: location.origin });
    },
    deleteOperator(name) { return invoke('create-operator', { action: 'delete', name }); },

    // ---------- LANGGANAN ----------
    async getSubscriptionStatus() { const s = await rpc('my_subscription'); return { price: window.SPPG_PRICE || 150000, ...(s || {}) }; },
    createSubscriptionPayment() { return invoke('create-midtrans-payment', {}); }
  };

  // Snap.js Midtrans (dimuat hanya bila Client Key sudah diisi)
  if (typeof MIDTRANS_CLIENT_KEY !== 'undefined' && !/ISI_/.test(MIDTRANS_CLIENT_KEY)) {
    const s = document.createElement('script');
    s.src = 'https://app' + (MIDTRANS_IS_PRODUCTION ? '' : '.sandbox') + '.midtrans.com/snap/snap.js';
    s.setAttribute('data-client-key', MIDTRANS_CLIENT_KEY);
    document.head.appendChild(s);
  }

  window.SPPG_API = API;
  window.SPPG_WS = { get: getWs, set: setWs };
})();
