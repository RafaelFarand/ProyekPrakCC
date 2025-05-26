const API_URL = "https://notes-1061342868557.us-central1.run.app"; // Ganti dengan URL backend Anda
let accessToken = "";
let currentUserId = null;
let currentUserRole = "customer";
let editingSparepartId = null;

// Mengatur Axios untuk mengirim cookies
axios.defaults.withCredentials = true;

// Setup axios interceptors untuk otomatis handle token refresh
axios.interceptors.request.use(
    (config) => {
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

axios.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;
        // Cek jika error 403 (Forbidden) dan belum mencoba refresh
        if (error.response?.status === 403 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const refreshResponse = await axios.get(`${API_URL}/token`);
                accessToken = refreshResponse.data.accessToken;
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return axios(originalRequest); // Coba lagi request asli dengan token baru
            } catch (refreshError) {
                console.error("Token refresh failed:", refreshError);
                accessToken = "";
                currentUserId = null;
                showLogin(); // Arahkan ke login jika refresh gagal
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
    // Pastikan ID elemen sesuai dengan index.html Anda
    document.getElementById('adminDashboardPage').style.display = "none";
    document.getElementById('customerDashboardPage').style.display = "none";
}

function showRegister() {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('registerSection').classList.remove('hidden');
    document.getElementById('adminDashboardPage').style.display = "none";
    document.getElementById('customerDashboardPage').style.display = "none";
}

// showAdminDashboard dan showCustomerDashboard akan dipanggil setelah login berhasil
// dan juga dipanggil di <script> di index.html
function showAdminDashboard() {
    // Logika localStorage ini ditambahkan dari saran sebelumnya
    const userData = localStorage.getItem('user');
    if (userData) {
        document.getElementById("mainPage").style.display = "none";
        document.getElementById("registerPage").style.display = "none";
        document.getElementById("adminDashboardPage").style.display = "block";
        document.getElementById("customerDashboardPage").style.display = "none";
        loadSpareparts(); // Muat ulang daftar sparepart admin
    } else {
        alert('Sesi tidak valid. Silakan login kembali.');
        showLogin();
    }
}

function showCustomerDashboard() {
    document.getElementById("mainPage").style.display = "none";
    document.getElementById("registerPage").style.display = "none";
    document.getElementById("adminDashboardPage").style.display = "none";
    document.getElementById("customerDashboardPage").style.display = "block";
    // Memastikan fungsi-fungsi ini ada sebelum memanggilnya
    if (window.loadAvailableSpareparts) window.loadAvailableSpareparts();
    if (window.loadCart) window.loadCart();
    if (window.loadMyOrders) window.loadMyOrders();
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

        // Simpan data user ke localStorage (dari saran sebelumnya)
        localStorage.setItem('user', JSON.stringify(response.data.safeUserData));


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
        localStorage.removeItem('user'); // Hapus data user dari localStorage
        showLogin();
    }
}

// --- TOKEN REFRESH ---
// Fungsi ini mungkin tidak perlu dipanggil secara eksplisit jika interceptor sudah menangani
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

// --- API HELPER ---
// Fungsi apiCall ini tetap dipertahankan untuk konsistensi dan penanganan FormData
// Meskipun interceptor sudah menangani otorisasi, apiCall bisa jadi wrapper yang rapi
async function apiCall(method, endpoint, data = null, isFormData = false) {
    try {
        const config = {
            method,
            url: `<span class="math-inline">\{API\_URL\}</span>{endpoint}`,
            // Headers Authorization akan ditambahkan oleh interceptor Axios
        };

        if (data) {
            config.data = data;
            if (!isFormData) {
                config.headers = { ...config.headers, 'Content-Type': 'application/json' };
            }
            // Untuk FormData, biarkan browser set Content-Type otomatis
        }

        return await axios(config);
    } catch (error) {
        // Interceptor Axios sudah mencoba refresh token. Jika masih error,
        // berarti ada masalah lain atau refresh token gagal.
        console.error(`API Call Error (${method} ${endpoint}):`, error);
        throw error; // Lempar error agar bisa ditangkap di fungsi pemanggil
    }
}

// --- SPAREPART MANAGEMENT (ADMIN) ---
async function loadSpareparts() {
    try {
        const response = await apiCall('get', '/spareparts');
        const spareparts = response.data; // Asumsi response.data adalah array sparepart
        const container = document.getElementById('sparepartsList');
        container.innerHTML = '';

        if (spareparts.length === 0) {
            container.innerHTML = '<p>Belum ada sparepart.</p>';
            return;
        }

        spareparts.forEach(part => {
            const card = document.createElement('div');
            card.className = 'sparepart-card';
            // Perhatikan: `part.image` adalah nama file, bukan URL lengkap
            const imageUrl = part.image ? `<span class="math-inline">\{API\_URL\}/uploads/</span>{part.image}` : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zNS41IDQwLjVIMjguNVYzMy41SDM1LjVWNDAuNVoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';

            card.innerHTML = `
                <img src="<span class="math-inline">\{imageUrl\}" alt\="</span>{part.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zNS41IDQwLjVIMjguNVYzMy41SDM1LjVWNDAuNVoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+'">
                <h3>${part.name}</h3>
                <p>Stok: <span class="math-inline">\{part\.stock\}</p\>
<p\>Harga\: Rp</span>{Number(part.price).toLocaleString('id-ID')}</p>
                <div class="card-actions">
                    <button onclick="editSparepart(<span class="math-inline">\{part\.id\}\)"\>Edit</button\>
<button onclick\="deleteSparepart\(</span>{part.id})" style="background:#d32f2f;color:white;">Hapus</button>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error("Error loading spareparts:", error);
        alert("Gagal memuat data sparepart");
    }
}

async function editSparepart(id) {
    try {
        // Ambil data sparepart spesifik untuk diedit
        const response = await apiCall('get', `/spareparts/${id}`); // Asumsi ada endpoint GET /spareparts/:id
        const sparepart = response.data; // Asumsi response.data adalah objek sparepart tunggal

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

async function saveSparepart() {
    const name = document.getElementById('sparepartName').value;
    const stock = document.getElementById('sparepartStock').value;
    const price = document.getElementById('sparepartPrice').value;
    const imageInput = document.getElementById('sparepartImage');

    if (!name || !stock || !price) {
        alert('Nama, stok, dan harga harus diisi!');
        return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('stock', stock);
    formData.append('price', price);

    // Tambahkan file jika ada
    if (imageInput.files && imageInput.files.length > 0) {
        formData.append('image', imageInput.files[0]);
    } else if (!editingSparepartId) {
        // Jika mode tambah baru dan tidak ada gambar
        alert('Gambar wajib diupload untuk sparepart baru!');
        return;
    }

    try {
        let endpoint = '/spareparts';
        let method = 'post';

        if (editingSparepartId) {
            endpoint = `/spareparts/${editingSparepartId}`;
            method = 'put';
            // Tidak perlu menambahkan ID ke formData karena sudah ada di URL
        }

        const response = await apiCall(method, endpoint, formData, true); // isFormData = true

        if (response.data) { // Asumsi backend mengembalikan data atau pesan sukses
            alert(`Sparepart berhasil di${editingSparepartId ? 'update' : 'simpan'}!`);
            // Reset form
            document.getElementById('sparepartForm').classList.add('hidden');
            document.getElementById('sparepartName').value = '';
            document.getElementById('sparepartStock').value = '';
            document.getElementById('sparepartPrice').value = '';
            document.getElementById('sparepartImage').value = '';
            editingSparepartId = null;
            loadSpareparts(); // Muat ulang daftar sparepart di admin dashboard
        } else {
            alert('Gagal menyimpan/update sparepart.');
        }
    } catch (error) {
        console.error('Error saving/updating sparepart:', error);
        alert(`Terjadi kesalahan saat menyimpan/update sparepart: ${error.response?.data?.message || error.message}`);
    }
}

async function deleteSparepart(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus sparepart ini? Semua data pembelian terkait juga akan dihapus.')) {
        return;
    }

    try {
        await apiCall('delete', `/spareparts/${id}`);
        alert('Sparepart berhasil dihapus!');
        loadSpareparts(); // Muat ulang daftar sparepart di admin dashboard
    } catch (error) {
        console.error("Error deleting sparepart:", error);
        alert(`Gagal menghapus data: ${error.response?.data?.message || error.message}`);
    }
}

// --- SPAREPART MANAGEMENT (CUSTOMER) ---
// Fungsi untuk merender satu kartu sparepart
window.renderSparepartCard = function (sparepart) {
    // Perhatikan: `sparepart.image` adalah nama file, bukan URL lengkap
    const imageUrl = sparepart.image ? `<span class="math-inline">\{API\_URL\}/uploads/</span>{sparepart.image}` : 'https://placehold.co/120x80/cccccc/000000?text=No+Image';

    return `
        <div class="sparepart-card">
            <img src="<span class="math-inline">\{imageUrl\}" alt\="</span>{sparepart.name}" onerror="this.src='https://placehold.co/120x80/cccccc/000000?text=No+Image'">
            <h3>${sparepart.name}</h3>
            <p>Stok: <span class="math-inline">\{sparepart\.stock\}</p\>
<p\>Harga\: Rp</span>{Number(sparepart.price).toLocaleString('id-ID')}</p>
            <div class="card-actions">
                <input type="number" min="1" max="<span class="math-inline">\{sparepart\.stock\}" value\="1" id\="qty\-</span>{sparepart.id}" style="width:60px;">
                <button onclick="addToCart(<span class="math-inline">\{sparepart\.id\}, document\.getElementById\('qty\-</span>{sparepart.id}').value)">Beli</button>
            </div>
        </div>
    `;
};

// Fungsi untuk memuat dan menampilkan sparepart yang tersedia untuk customer
window.loadAvailableSpareparts = async function () {
    const container = document.getElementById('availableSpareparts');
    container.innerHTML = 'Loading...';
    try {
        const response = await apiCall('get', '/spareparts');
        const spareparts = response.data; // Asumsi response.data adalah array spareparts
        const availableSpareparts = spareparts.filter(part => part.stock > 0);

        if (availableSpareparts.length === 0) {
            container.innerHTML = '<p>Tidak ada sparepart yang tersedia saat ini.</p>';
            return;
        }

        // Render setiap sparepart menggunakan renderSparepartCard
        container.innerHTML = availableSpareparts.map(part => window.renderSparepartCard(part)).join('');
    } catch (error) {
        console.error("Error loading available spareparts:", error);
        container.innerHTML = 'Gagal memuat sparepart.';
        alert("Gagal memuat data sparepart");
    }
};

// --- CART MANAGEMENT (CUSTOMER) ---
let editingCartId = null; // Variabel global untuk menyimpan ID cart yang sedang diedit

// Fungsi untuk memuat dan menampilkan item di keranjang
window.loadCart = async function () {
    const cartTbody = document.getElementById('cartTbody');
    cartTbody.innerHTML = `<tr><td colspan="5">Loading...</td></tr>`;
    try {
        // Menggunakan apiCall untuk mendapatkan item keranjang (dengan otorisasi)
        // Perhatikan endpoint: /cart/:id_user
        const res = await apiCall('get', `/cart/${currentUserId}`);
        const cart = res.data.data || []; // Asumsi data keranjang ada di res.data.data

        if (cart.length === 0) {
            cartTbody.innerHTML = `<tr><td colspan="5">Keranjang kosong</td></tr>`;
            document.getElementById('checkoutBtn').disabled = true;
            return;
        }
        document.getElementById('checkoutBtn').disabled = false;
        cartTbody.innerHTML = '';

        cart.forEach(item => {
            const disabled = item.status !== 'cart'; // Tombol edit/hapus hanya aktif jika status 'cart'
            cartTbody.innerHTML += `
                <tr>
                    <td>${item.sparepart?.name || 'N/A'}</td>
                    <td>${item.jumlah}</td>
                    <td>Rp${Number(item.sparepart?.price || 0).toLocaleString('id-ID')}</td>
                    <td>Rp${Number(item.total_harga || 0).toLocaleString('id-ID')}</td>
                    <td>
                        ${disabled ? '-' : `
                            <button onclick="showEditCartModal(${item.id}, ${item.jumlah})">Edit</button>
                            <button onclick="deleteCartItem(${item.id})" style="background:#d32f2f;color:#fff;">Hapus</button>
                        `}
                    </td>
                </tr>
            `;
        });
    } catch (e) {
        console.error("Error loading cart:", e);
        cartTbody.innerHTML = `<tr><td colspan="5">Gagal memuat keranjang</td></tr>`;
        alert("Gagal memuat keranjang");
    }
};

// Fungsi untuk menambah item ke keranjang dari daftar sparepart
window.addToCart = async function (id_sparepart, jumlah) {
    if (!currentUserId) {
        alert('Anda harus login untuk menambahkan item ke keranjang!');
        showLogin();
        return;
    }
    const parsedJumlah = parseInt(jumlah, 10);
    if (isNaN(parsedJumlah) || parsedJumlah < 1) {
        alert('Jumlah harus angka positif!');
        return;
    }

    try {
        // Menggunakan apiCall untuk menambah item ke keranjang (dengan otorisasi)
        const cartItem = {
            id_user: currentUserId,
            id_sparepart: id_sparepart,
            jumlah: parsedJumlah
        };
        await apiCall('post', '/cart', cartItem);
        alert('Item ditambahkan ke keranjang.');
        loadCart(); // Perbarui tampilan keranjang
        loadAvailableSpareparts(); // Perbarui stok di daftar sparepart
    } catch (error) {
        console.error("Error adding to cart:", error);
        alert(`Gagal menambahkan ke keranjang: ${error.response?.data?.message || error.message}`);
    }
};

// Menampilkan modal edit keranjang
window.showEditCartModal = function (id, jumlah) {
    editingCartId = id;
    document.getElementById('editJumlahInput').value = jumlah;
    document.getElementById('editCartModal').style.display = 'block';
};

// Menutup modal edit keranjang
window.closeEditCartModal = function () {
    document.getElementById('editCartModal').style.display = 'none';
    editingCartId = null;
};

// Event listener untuk tombol simpan di modal edit keranjang
document.getElementById('saveEditCartBtn').onclick = async function () {
    const jumlah = parseInt(document.getElementById('editJumlahInput').value, 10);
    if (isNaN(jumlah) || jumlah < 1) {
        alert('Jumlah minimal 1!');
        return;
    }
    try {
        // Menggunakan apiCall untuk memperbarui jumlah item di keranjang (dengan otorisasi)
        await apiCall('put', `/cart/${editingCartId}`, { jumlah });
        alert('Jumlah diperbarui.');
        closeEditCartModal();
        loadCart(); // Perbarui tampilan keranjang
        loadAvailableSpareparts(); // Perbarui stok di daftar sparepart
    } catch (error) {
        console.error("Update cart error:", error);
        alert(`Gagal update jumlah: ${error.response?.data?.message || error.message}`);
    }
};

// Menghapus item dari keranjang
window.deleteCartItem = async function (id) {
    if (!confirm('Hapus item ini dari keranjang?')) return;
    try {
        // Menggunakan apiCall untuk menghapus item dari keranjang (dengan otorisasi)
        await apiCall('delete', `/cart/${id}`);
        alert('Item dihapus dari keranjang.');
        loadCart(); // Perbarui tampilan keranjang
        loadAvailableSpareparts(); // Perbarui stok di daftar sparepart
    } catch (error) {
        console.error("Remove cart error:", error);
        alert(`Gagal menghapus item: ${error.response?.data?.message || error.message}`);
    }
};

// Checkout semua item di keranjang
document.getElementById('checkoutBtn').onclick = async function () {
    if (!confirm('Checkout semua item di keranjang?')) return;
    if (!currentUserId) {
        alert('Anda harus login untuk melakukan checkout!');
        showLogin();
        return;
    }
    try {
        // Menggunakan apiCall untuk checkout (dengan otorisasi)
        await apiCall('post', '/cart/checkout', { id_user: currentUserId });
        alert('Checkout berhasil! Silakan lakukan pembayaran.');
        loadCart(); // Perbarui tampilan keranjang (seharusnya kosong atau berubah status)
        if (window.loadMyOrders) window.loadMyOrders(); // Perbarui riwayat pesanan
    } catch (error) {
        console.error("Checkout error:", error);
        alert(`Checkout gagal: ${error.response?.data?.message || error.message}`);
    }
};

// --- ORDER MANAGEMENT (CUSTOMER) ---
// Fungsi untuk memuat dan menampilkan riwayat pesanan customer
window.loadMyOrders = async function () {
    const container = document.getElementById('myOrders');
    container.innerHTML = 'Loading...';
    if (!currentUserId) {
        container.innerHTML = '<p>Silakan login untuk melihat pesanan Anda.</p>';
        return;
    }
    try {
        // Menggunakan apiCall untuk mendapatkan riwayat pesanan (dengan otorisasi)
        // Perhatikan endpoint: /orders/:id_user
        const response = await apiCall('get', `/orders/${currentUserId}`);
        const orders = response.data.data || []; // Asumsi data pesanan ada di response.data.data

        if (orders.length === 0) {
            container.innerHTML = '<p>Belum ada pesanan.</p>';
            return;
        }

        container.innerHTML = '';
        orders.forEach(order => {
            const item = document.createElement('div');
            item.className = 'sparepart-card'; // Bisa disesuaikan stylingnya agar berbeda dari sparepart biasa

            // Perhatikan: `order.sparepart.image` adalah nama file, bukan URL lengkap
            const imageUrl = order.sparepart?.image ? `${API_URL}/uploads/${order.sparepart.image}` : 'https://placehold.co/150x100/cccccc/000000?text=No+Image';

            item.innerHTML = `
                <img src="${imageUrl}" alt="${order.sparepart?.name || 'N/A'}" onerror="this.src='https://placehold.co/150x100/cccccc/000000?text=No+Image'">
                <h3>${order.sparepart?.name || 'N/A'}</h3>
                <p>Status: ${order.status}</p>
                <p>Jumlah: ${order.jumlah}</p>
                <p>Total Harga: Rp${Number(order.total_harga || 0).toLocaleString('id-ID')}</p>
                <p>Tanggal Order: ${new Date(order.tanggal_order).toLocaleDateString('id-ID')}</p>
                ${order.status === 'ordered' ? `
                    <button onclick="payOrder(${order.id})" style="background:#2366b3;color:white;">Bayar</button>
                    <button onclick="cancelOrder(${order.id})" style="background:#d32f2f;color:white;">Batalkan</button>
                ` : ''}
            `;
            container.appendChild(item);
        });
    } catch (error) {
        console.error("Error loading orders:", error);
        container.innerHTML = '<p>Gagal memuat pesanan.</p>';
        alert("Gagal memuat pesanan");
    }
};

// Fungsi untuk memproses pembayaran pesanan
window.payOrder = async function (id) {
    if (!confirm('Apakah Anda yakin ingin memproses pembayaran pesanan ini?')) return;
    try {
        // Menggunakan apiCall untuk memproses pembayaran (dengan otorisasi)
        await apiCall('put', `/orders/${id}/pay`);
        alert('Pembayaran berhasil diproses.');
        loadMyOrders(); // Perbarui riwayat pesanan
    } catch (error) {
        console.error("Error paying order:", error);
        alert(`Gagal memproses pembayaran: ${error.response?.data?.message || error.message}`);
    }
};

// Fungsi untuk membatalkan pesanan
window.cancelOrder = async function (id) {
    if (!confirm('Apakah Anda yakin ingin membatalkan pesanan ini?')) return;
    try {
        // Menggunakan apiCall untuk membatalkan pesanan (dengan otorisasi)
        await apiCall('put', `/orders/${id}/cancel`);
        alert('Pesanan berhasil dibatalkan.');
        loadMyOrders(); // Perbarui riwayat pesanan
    } catch (error) {
        console.error("Error cancelling order:", error);
        alert(`Gagal membatalkan pesanan: ${error.response?.data?.message || error.message}`);
    }
};

// --- INISIALISASI ---
// Cek apakah ada user di localStorage saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
        const user = JSON.parse(storedUser);
        currentUserId = user.id;
        currentUserRole = user.username.toLowerCase().includes('admin') ? 'admin' : 'customer';
        accessToken = ''; // Jika token disimpan terpisah, ambil dari sana
        if (currentUserRole === 'admin') {
            showAdminDashboard();
        } else {
            showCustomerDashboard();
        }
    } else {
        showLogin();
    }
});