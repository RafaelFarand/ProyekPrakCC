// API URL Configuration
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? "http://localhost:5000/api"
    : "https://notes-1061342868557.us-central1.run.app/api";

// Global variables
let accessToken = localStorage.getItem('accessToken');
let currentUserId = localStorage.getItem('userId');
let currentUserRole = localStorage.getItem('userRole');
let editingSparepartId = null;

// Axios Configuration
axios.defaults.withCredentials = true;

// Token refresh interceptor
axios.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 403 && !error.config._retry) {
            error.config._retry = true;
            try {
                const response = await axios.get(`${API_URL}/token`);
                const newToken = response.data.accessToken;
                localStorage.setItem('accessToken', newToken);
                accessToken = newToken;
                error.config.headers['Authorization'] = `Bearer ${newToken}`;
                return axios(error.config);
            } catch (refreshError) {
                await logout();
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

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
    // Reset form untuk penambahan baru
    document.getElementById('sparepartForm').classList.remove('hidden');
    document.getElementById('sparepartName').value = '';
    document.getElementById('sparepartStock').value = '';
    document.getElementById('sparepartPrice').value = '';
    document.getElementById('sparepartImage').value = '';
    editingSparepartId = null;
}

// --- AUTENTIKASI ---
// Modified register function
async function register() {
    try {
        const email = document.getElementById('regEmail').value;
        const username = document.getElementById('regUsername').value;
        const password = document.getElementById('regPassword').value;

        if (!email || !username || !password) {
            alert('Semua field harus diisi!');
            return;
        }

        await axios.post(`${API_URL}/register`, {
            email,
            username,
            password
        });

        alert('Registrasi berhasil! Silakan login.');
        showLogin();
    } catch (error) {
        console.error("Error registrasi:", error);
        alert(error.response?.data?.message || 'Registrasi gagal! Pastikan email belum terdaftar.');
    }
}

// Modified login function
async function login() {
    try {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        if (!email || !password) {
            alert('Email dan password harus diisi!');
            return;
        }

        const response = await axios.post(`${API_URL}/login`, {
            email,
            password
        });

        const { accessToken: token, user } = response.data;
        
        accessToken = token;
        currentUserId = user.id;
        currentUserRole = user.role;

        localStorage.setItem('accessToken', token);
        localStorage.setItem('userId', user.id);
        localStorage.setItem('userRole', user.role);

        if (user.role === 'admin') {
            showAdminDashboard();
        } else {
            showCustomerDashboard();
        }
    } catch (error) {
        console.error("Error login:", error);
        alert('Login gagal! Periksa email dan password Anda.');
    }
}

async function logout() {
    try {
        await axios.get(`${API_URL}/api/logout`);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('userId');
        localStorage.removeItem('userRole');
        accessToken = null;
        currentUserId = null;
        currentUserRole = null;
        showLogin();
    } catch (error) {
        console.error("Error logout:", error);
        // Still clear local storage and redirect even if logout fails
        localStorage.clear();
        showLogin();
    }
}

// --- TOKEN REFRESH ---
// Modified refreshToken function
async function refreshToken() {
    try {
        const response = await axios.get(`${API_URL}/token`, {
            withCredentials: true
        });
        
        if (response.data.accessToken) {
            accessToken = response.data.accessToken;
            return true;
        }
        return false;
    } catch (error) {
        console.error("Token refresh failed:", error);
        await logout();
        return false;
    }
}

// --- API HELPER ---
// Modified apiCall function
async function apiCall(method, endpoint, data = null, formData = false) {
    try {
        const config = {
            method,
            url: `${API_URL}${endpoint}`,
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            withCredentials: true
        };

        if (data) {
            config.data = data;
            if (formData) {
                config.headers['Content-Type'] = 'multipart/form-data';
            }
        }

        const response = await axios(config);
        return response.data;
    } catch (error) {
        if (error.response?.status === 401) {
            await logout();
            throw new Error('Sesi Anda telah berakhir. Silakan login kembali.');
        }
        throw error;
    }
}

// --- SPAREPART MANAGEMENT ---
async function loadSpareparts() {
    try {
        const response = await apiCall('get', '/spareparts');
        const spareparts = response.data;
        const container = document.getElementById('sparepartsList');
        container.innerHTML = '';

        spareparts.forEach(part => {
            const card = document.createElement('div');
            card.className = 'card';
            
            let imageHtml = '';
            if (part.image) {
                imageHtml = `<img src="${API_URL}/uploads/${part.image}" alt="${part.name}" style="max-width: 100%; height: auto;">`;
            }
            
            card.innerHTML = `
                ${imageHtml}
                <h3>${part.name}</h3>
                <p>Stok: ${part.stock}</p>
                <p>Harga: Rp${part.price}</p>
                <button onclick="editSparepart(${part.id})">Edit</button>
                <button onclick="deleteSparepart(${part.id})">Hapus</button>
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

        spareparts.forEach(part => {
            if (part.stock > 0) { // Hanya tampilkan yang ada stoknya
                const card = document.createElement('div');
                card.className = 'card';
                
                let imageHtml = '';
                if (part.image) {
                    imageHtml = `<img src="${API_URL}/uploads/${part.image}" alt="${part.name}" style="max-width: 100%; height: auto;">`;
                }
                
                card.innerHTML = `
                    ${imageHtml}
                    <h3>${part.name}</h3>
                    <p>Stok: ${part.stock}</p>
                    <p>Harga: Rp${part.price}</p>
                    <input type="number" id="qty-${part.id}" min="1" max="${part.stock}" value="1">
                    <button onclick="buySparepart(${part.id})">Beli</button>
                `;
                container.appendChild(card);
            }
        });
    } catch (error) {
        console.error("Error loading available spareparts:", error);
        alert("Gagal memuat data sparepart");
    }
}

async function editSparepart(id) {
    try {
        // Ambil data sparepart yang akan diedit
        const response = await apiCall('get', '/spareparts');
        const sparepart = response.data.find(part => part.id === id);
        
        if (!sparepart) {
            alert('Sparepart tidak ditemukan!');
            return;
        }
        
        // Set form untuk editing
        document.getElementById('sparepartName').value = sparepart.name;
        document.getElementById('sparepartStock').value = sparepart.stock;
        document.getElementById('sparepartPrice').value = sparepart.price;
        document.getElementById('sparepartForm').classList.remove('hidden');
        
        // Simpan ID untuk nanti
        editingSparepartId = id;
    } catch (error) {
        console.error("Error fetching sparepart for edit:", error);
        alert("Gagal mengambil data sparepart");
    }
}

async function saveSparepart() {
    try {
        const name = document.getElementById('sparepartName').value;
        const stock = document.getElementById('sparepartStock').value;
        const price = document.getElementById('sparepartPrice').value;
        const imageInput = document.getElementById('sparepartImage');
        
        if (!name || !stock || !price) {
            alert('Semua field harus diisi kecuali gambar!');
            return;
        }
        
        const formData = new FormData();
        formData.append('name', name);
        formData.append('stock', stock);
        formData.append('price', price);
        
        if (imageInput.files[0]) {
            const file = imageInput.files[0];
            // Validate file size
            if (file.size > 5 * 1024 * 1024) {
                alert('Ukuran file terlalu besar (maksimal 5MB)');
                return;
            }
            // Validate file type
            if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
                alert('Format file tidak didukung (gunakan JPG, PNG, atau GIF)');
                return;
            }
            formData.append('image', file);
        }
        
        if (editingSparepartId) {
            await apiCall('put', `/spareparts/${editingSparepartId}`, formData, true);
            alert('Sparepart berhasil diperbarui!');
        } else {
            await apiCall('post', '/spareparts', formData, true);
            alert('Sparepart berhasil ditambahkan!');
        }
        
        document.getElementById('sparepartForm').classList.add('hidden');
        editingSparepartId = null;
        loadSpareparts();
    } catch (error) {
        console.error("Error saving sparepart:", error);
        alert(`Gagal menyimpan data: ${error.response?.data?.message || error.message}`);
    }
}

async function deleteSparepart(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus sparepart ini?')) {
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
        loadAvailableSpareparts(); // Reload untuk mendapatkan stok terbaru
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
                <tr>
                    <th>No</th>
                    <th>Nama Sparepart</th>
                    <th>Jumlah</th>
                    <th>Harga Satuan</th>
                    <th>Total</th>
                    <th>Aksi</th>
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
                <td>${index + 1}</td>
                <td>${order.sparepart.name}</td>
                <td>${order.jumlah}</td>
                <td>Rp${order.sparepart.price}</td>
                <td>Rp${total}</td>
                <td>
                    <button onclick="cancelOrder(${order.id})">Batalkan</button>
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
        alert('Pesanan berhasil dibatalkan!');
        loadMyOrders();
        loadAvailableSpareparts(); // Reload untuk mendapatkan stok terbaru
    } catch (error) {
        console.error("Error canceling order:", error);
        alert(`Gagal membatalkan pesanan: ${error.response?.data?.message || error.message}`);
    }
}

// --- INISIALISASI ---
// Modified window.onload
window.onload = async function() {
    try {
        const success = await refreshToken();
        if (success && currentUserRole) {
            if (currentUserRole === 'admin') {
                showAdminDashboard();
            } else {
                showCustomerDashboard();
            }
        } else {
            showLogin();
        }
    } catch (error) {
        console.error("Initialization error:", error);
        showLogin();
    }
};

// --- Export fungsi untuk digunakan di HTML inline ---
window.showLogin = showLogin;
window.showRegister = showRegister;
window.register = register;
window.login = login;
window.logout = logout;
window.showAddForm = showAddForm;
window.saveSparepart = saveSparepart;
window.editSparepart = editSparepart;
window.deleteSparepart = deleteSparepart;
window.buySparepart = buySparepart;
window.cancelOrder = cancelOrder;
