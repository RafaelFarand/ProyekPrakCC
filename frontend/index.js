const API_URL = "https://notes-1061342868557.us-central1.run.app";
let accessToken = "";
let currentUserId = null;
let currentUserRole = "customer";
let editingSparepartId = null;

// Mengatur Axios untuk mengirim cookies
axios.defaults.withCredentials = true;

// --- NAVIGASI ---
function showLogin() {
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('registerSection').classList.add('hidden');
    document.getElementById('adminDashboard').classList.add('hidden');
    document.getElementById('customerDashboard').classList.add('hidden');
}

function showRegister() {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('registerSection').classList.remove('hidden');
    document.getElementById('adminDashboard').classList.add('hidden');
    document.getElementById('customerDashboard').classList.add('hidden');
}

function showAdminDashboard() {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('registerSection').classList.add('hidden');
    document.getElementById('adminDashboard').classList.remove('hidden');
    document.getElementById('customerDashboard').classList.add('hidden');
    loadSpareparts();
}

function showCustomerDashboard() {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('registerSection').classList.add('hidden');
    document.getElementById('adminDashboard').classList.add('hidden');
    document.getElementById('customerDashboard').classList.remove('hidden');
    loadAvailableSpareparts();
    loadMyOrders();
}

function showAddForm() {
    document.getElementById('sparepartForm').classList.remove('hidden');
    document.getElementById('sparepartName').value = '';
    document.getElementById('sparepartStock').value = '';
    document.getElementById('sparepartPrice').value = '';
    document.getElementById('sparepartImage').value = '';
    editingSparepartId = null;
}

// --- AUTENTIKASI ---
async function register() {
    const email = document.getElementById('regEmail').value;
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;

    if (!email || !username || !password) {
        alert('Semua field harus diisi!');
        return;
    }

    try {
        const response = await axios.post(`${API_URL}/register`, {
            email,
            username,
            password
        });
        alert('Registrasi berhasil! Silakan login.');
        showLogin();
    } catch (error) {
        console.error('Register error:', error);
        alert(`Registrasi gagal: ${error.response?.data?.message || error.message}`);
    }
}

async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
        alert('Email dan password harus diisi!');
        return;
    }

    try {
        const response = await axios.post(`${API_URL}/login`, {
            email,
            password
        });

        accessToken = response.data.accessToken;
        currentUserId = response.data.safeUserData.id;
        currentUserRole = response.data.safeUserData.username.toLowerCase().includes('admin') ? 'admin' : 'customer';

        if (currentUserRole === 'admin') {
            showAdminDashboard();
        } else {
            showCustomerDashboard();
        }
    } catch (error) {
        console.error('Login error:', error);
        alert(`Login gagal: ${error.response?.data?.message || error.message}`);
    }
}

async function logout() {
    try {
        await axios.get(`${API_URL}/logout`);
    } catch (error) {
        console.error("Logout error:", error);
    } finally {
        accessToken = '';
        currentUserId = null;
        showLogin();
    }
}

// --- TOKEN REFRESH ---
async function refreshToken() {
    try {
        const response = await axios.get(`${API_URL}/token`);
        accessToken = response.data.accessToken;
        return true;
    } catch (error) {
        console.error("Token refresh failed:", error);
        accessToken = '';
        currentUserId = null;
        return false;
    }
}

// --- API HELPER (PERBAIKAN) ---
async function apiCall(method, endpoint, data = null, isFormData = false) {
    try {
        const config = {
            method,
            url: `${API_URL}${endpoint}`,
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        };

        if (data) {
            config.data = data;
            if (!isFormData) {
                config.headers['Content-Type'] = 'application/json';
            }
            // Untuk FormData, biarkan browser set Content-Type otomatis
        }

        return await axios(config);
    } catch (error) {
        if (error.response && error.response.status === 403) {
            const refreshed = await refreshToken();
            if (refreshed) {
                // Retry dengan token baru
                const retryConfig = {
                    method,
                    url: `${API_URL}${endpoint}`,
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                };

                if (data) {
                    retryConfig.data = data;
                    if (!isFormData) {
                        retryConfig.headers['Content-Type'] = 'application/json';
                    }
                }

                return await axios(retryConfig);
            } else {
                showLogin();
            }
        }
        throw error;
    }
}

// --- SPAREPART MANAGEMENT (PERBAIKAN) ---
async function loadSpareparts() {
    try {
        const response = await apiCall('get', '/spareparts');
        const spareparts = response.data;
        const container = document.getElementById('sparepartsList');
        container.innerHTML = '';

        if (spareparts.length === 0) {
            container.innerHTML = '<p>Belum ada sparepart.</p>';
            return;
        }

        spareparts.forEach(part => {
            const card = document.createElement('div');
            card.className = 'sparepart-card';
            let imageHtml = '';
            if (part.image) {
                imageHtml = `<img src="${API_URL}/uploads/${part.image}" alt="${part.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zNS41IDQwLjVIMjguNVYzMy41SDM1LjVWNDAuNVoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+'">`;
            }
            card.innerHTML = `
                ${imageHtml}
                <h3>${part.name}</h3>
                <p>Stok: ${part.stock}</p>
                <p>Harga: Rp${Number(part.price).toLocaleString('id-ID')}</p>
                <div class="card-actions">
                    <button onclick="editSparepart(${part.id})">Edit</button>
                    <button onclick="deleteSparepart(${part.id})" style="background:#d32f2f;color:white;">Hapus</button>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error("Error loading spareparts:", error);
        alert("Gagal memuat data sparepart");
    }
}

async function loadAvailableSpareparts() {
    try {
        const response = await apiCall('get', '/spareparts');
        const spareparts = response.data;
        const container = document.getElementById('availableSpareparts');
        container.innerHTML = '';

        const availableSpareparts = spareparts.filter(part => part.stock > 0);
        
        if (availableSpareparts.length === 0) {
            container.innerHTML = '<p>Tidak ada sparepart yang tersedia saat ini.</p>';
            return;
        }

        availableSpareparts.forEach(part => {
            const card = document.createElement('div');
            card.className = 'sparepart-card';
            let imageHtml = '';
            if (part.image) {
                imageHtml = `<img src="${API_URL}/uploads/${part.image}" alt="${part.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zNS41IDQwLjVIMjguNVYzMy41SDM1LjVWNDAuNVoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+'">`;
            }
            card.innerHTML = `
                ${imageHtml}
                <h3>${part.name}</h3>
                <p>Stok: ${part.stock}</p>
                <p>Harga: Rp${Number(part.price).toLocaleString('id-ID')}</p>
                <input type="number" id="qty-${part.id}" min="1" max="${part.stock}" value="1" style="width:80px;margin:8px auto;display:block;">
                <button onclick="buySparepart(${part.id})" style="background:#2366b3;color:white;">Beli</button>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error("Error loading available spareparts:", error);
        alert("Gagal memuat data sparepart");
    }
}

async function editSparepart(id) {
    try {
        const response = await apiCall('get', '/spareparts');
        const sparepart = response.data.find(part => part.id === id);

        if (!sparepart) {
            alert('Sparepart tidak ditemukan!');
            return;
        }

        document.getElementById('sparepartName').value = sparepart.name;
        document.getElementById('sparepartStock').value = sparepart.stock;
        document.getElementById('sparepartPrice').value = sparepart.price;
        document.getElementById('sparepartForm').classList.remove('hidden');

        editingSparepartId = id;
    } catch (error) {
        console.error("Error fetching sparepart for edit:", error);
        alert("Gagal mengambil data sparepart");
    }
}

// PERBAIKAN UTAMA: saveSparepart function
async function saveSparepart() {
    const name = document.getElementById('sparepartName').value;
    const stock = document.getElementById('sparepartStock').value;
    const price = document.getElementById('sparepartPrice').value;
    const imageInput = document.getElementById('sparepartImage');

    if (!name || !stock || !price) {
        alert('Nama, stok, dan harga harus diisi!');
        return;
    }

    // Validasi untuk penambahan baru (harus ada gambar)
    if (!editingSparepartId && (!imageInput.files || imageInput.files.length === 0)) {
        alert('Gambar wajib diupload untuk sparepart baru!');
        return;
    }

    try {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('stock', stock);
        formData.append('price', price);

        // Tambahkan file jika ada
        if (imageInput.files && imageInput.files.length > 0) {
            formData.append('image', imageInput.files[0]);
        }

        let response;
        if (editingSparepartId) {
            response = await apiCall('put', `/spareparts/${editingSparepartId}`, formData, true);
            alert('Sparepart berhasil diperbarui!');
        } else {
            response = await apiCall('post', '/spareparts', formData, true);
            alert('Sparepart berhasil ditambahkan!');
        }

        // Reset form
        document.getElementById('sparepartForm').classList.add('hidden');
        document.getElementById('sparepartName').value = '';
        document.getElementById('sparepartStock').value = '';
        document.getElementById('sparepartPrice').value = '';
        document.getElementById('sparepartImage').value = '';
        editingSparepartId = null;
        
        loadSpareparts();
    } catch (error) {
        console.error("Error saving sparepart:", error);
        alert(`Gagal menyimpan data: ${error.response?.data?.message || error.message}`);
    }
}

async function deleteSparepart(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus sparepart ini? Semua data pembelian terkait juga akan dihapus.')) {
        return;
    }

    try {
        await apiCall('delete', `/spareparts/${id}`);
        alert('Sparepart berhasil dihapus!');
        loadSpareparts();
    } catch (error) {
        console.error("Error deleting sparepart:", error);
        alert(`Gagal menghapus data: ${error.response?.data?.message || error.message}`);
    }
}

// --- PEMBELIAN MANAGEMENT ---
async function buySparepart(sparepartId) {
    const qtyInput = document.getElementById(`qty-${sparepartId}`);
    const jumlah = parseInt(qtyInput.value, 10);

    if (!jumlah || jumlah < 1) {
        alert('Jumlah pembelian harus minimal 1!');
        return;
    }

    try {
        const orderData = {
            id_user: currentUserId,
            id_sparepart: sparepartId,
            jumlah: jumlah
        };

        await apiCall('post', '/pembelian', orderData);
        alert('Pembelian berhasil!');
        loadMyOrders();
        loadAvailableSpareparts();
    } catch (error) {
        console.error("Error creating order:", error);
        alert(`Gagal melakukan pembelian: ${error.response?.data?.message || error.message}`);
    }
}

async function loadMyOrders() {
    try {
        const response = await apiCall('get', `/pembelian/${currentUserId}`);
        const orders = response.data;
        const container = document.getElementById('myOrders');
        container.innerHTML = '';

        if (orders.length === 0) {
            container.innerHTML = '<p>Belum ada pesanan.</p>';
            return;
        }

        const orderTable = document.createElement('table');
        orderTable.style.width = '100%';
        orderTable.style.borderCollapse = 'collapse';
        orderTable.innerHTML = `
            <thead>
                <tr style="background:#f5f5f5;">
                    <th style="padding:8px;border:1px solid #ddd;">No</th>
                    <th style="padding:8px;border:1px solid #ddd;">Nama Sparepart</th>
                    <th style="padding:8px;border:1px solid #ddd;">Jumlah</th>
                    <th style="padding:8px;border:1px solid #ddd;">Harga Satuan</th>
                    <th style="padding:8px;border:1px solid #ddd;">Total</th>
                    <th style="padding:8px;border:1px solid #ddd;">Aksi</th>
                </tr>
            </thead>
            <tbody id="orderTableBody"></tbody>
        `;

        container.appendChild(orderTable);
        const tableBody = document.getElementById('orderTableBody');

        orders.forEach((order, index) => {
            const total = order.jumlah * order.sparepart.price;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="padding:8px;border:1px solid #ddd;text-align:center;">${index + 1}</td>
                <td style="padding:8px;border:1px solid #ddd;">${order.sparepart.name}</td>
                <td style="padding:8px;border:1px solid #ddd;text-align:center;">${order.jumlah}</td>
                <td style="padding:8px;border:1px solid #ddd;text-align:right;">Rp${Number(order.sparepart.price).toLocaleString('id-ID')}</td>
                <td style="padding:8px;border:1px solid #ddd;text-align:right;">Rp${Number(total).toLocaleString('id-ID')}</td>
                <td style="padding:8px;border:1px solid #ddd;text-align:center;">
                    <button onclick="cancelOrder(${order.id})" style="background:#d32f2f;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;">Batalkan</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error("Error loading orders:", error);
        document.getElementById('myOrders').innerHTML = '<p>Gagal memuat data pesanan.</p>';
    }
}

async function cancelOrder(orderId) {
    if (!confirm('Apakah Anda yakin ingin membatalkan pesanan ini?')) {
        return;
    }

    try {
        await apiCall('delete', `/pembelian/${orderId}`);
        alert('Pesanan berhasil dibatalkan!');c
        loadMyOrders();
        loadAvailableSpareparts();
    } catch (error) {
        console.error("Error canceling order:", error);
        alert(`Gagal membatalkan pesanan: ${error.response?.data?.message || error.message}`);
    }
}