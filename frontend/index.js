const API_URL = "https://notes-1061342868557.us-central1.run.app"; // Ganti dengan URL backend And
//const API_URL = "http://localhost:5000"
let accessToken = "";
let currentUserId = null;
let currentUserRole = "customer"; // Default: customer
let editingSparepartId = null;

// Mengatur Axios untuk mengirim cookies
axios.defaults.withCredentials = true;

// --- NAVIGASI ---
function showLogin() {
  document.getElementById("loginSection").classList.remove("hidden");
  document.getElementById("registerSection").classList.add("hidden");
  document.getElementById("adminDashboard").classList.add("hidden");
  document.getElementById("customerDashboard").classList.add("hidden");
}

function showRegister() {
  document.getElementById("loginSection").classList.add("hidden");
  document.getElementById("registerSection").classList.remove("hidden");
  document.getElementById("adminDashboard").classList.add("hidden");
  document.getElementById("customerDashboard").classList.add("hidden");
}

function showAdminDashboard() {
  document.getElementById("loginSection").classList.add("hidden");
  document.getElementById("registerSection").classList.add("hidden");
  document.getElementById("adminDashboard").classList.remove("hidden");
  document.getElementById("customerDashboard").classList.add("hidden");
  loadSpareparts();
}

function showCustomerDashboard() {
  document.getElementById("loginSection").classList.add("hidden");
  document.getElementById("registerSection").classList.add("hidden");
  document.getElementById("adminDashboard").classList.add("hidden");
  document.getElementById("customerDashboard").classList.remove("hidden");
  loadAvailableSpareparts();
  loadMyOrders();
}

function showAddForm() {
  // Reset form untuk penambahan baru
  document.getElementById("sparepartForm").classList.remove("hidden");
  document.getElementById("sparepartName").value = "";
  document.getElementById("sparepartStock").value = "";
  document.getElementById("sparepartPrice").value = "";
  document.getElementById("sparepartImage").value = "";
  editingSparepartId = null;
}

// --- AUTENTIKASI ---
async function register() {
  try {
    const email = document.getElementById("regEmail").value;
    const username = document.getElementById("regUsername").value;
    const password = document.getElementById("regPassword").value;

    // Validasi input
    if (!email || !username || !password) {
      alert("Semua field harus diisi!");
      return;
    }

    const response = await axios.post(`${API_URL}/register`, {
      email,
      username,
      password,
    });

    if (response.status === 201) {
      alert("Registrasi berhasil! Silakan login.");
      showLogin();
    }
  } catch (error) {
    console.error("Error registrasi:", error);
    alert(
      `Gagal registrasi: ${
        error.response?.data?.message || "Terjadi kesalahan"
      }`
    );
  }
}

async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if (!email || !password) {
    alert("Email dan password harus diisi!");
    return;
  }

  try {
    const response = await axios.post(
      `${API_URL}/login`,
      {
        email,
        password,
      },
      {
        withCredentials: true, // **Tambah ini**
      }
    );

    accessToken = response.data.accessToken;
    currentUserId = response.data.safeUserData.id;

    // Untuk demo, pengguna dianggap admin jika username mengandung "admin"
    currentUserRole = response.data.safeUserData.username
      .toLowerCase()
      .includes("admin")
      ? "admin"
      : "customer";

    if (currentUserRole === "admin") {
      showAdminDashboard();
    } else {
      showCustomerDashboard();
    }
  } catch (error) {
    alert(`Login gagal: ${error.response?.data?.message || error.message}`);
  }
}

async function logout() {
  try {
    await axios.get(`${API_URL}/logout`, {
      withCredentials: true, // **Tambah ini**
    });
    accessToken = "";
    currentUserId = null;
    showLogin();
  } catch (error) {
    console.error("Logout error:", error);
    // Tetap logout meskipun gagal
    accessToken = "";
    currentUserId = null;
    showLogin();
  }
}

// --- TOKEN REFRESH ---
async function refreshToken() {
  try {
    const response = await axios.get(`${API_URL}/token`, {
      withCredentials: true,
    });
    accessToken = response.data.accessToken;
    return true;
  } catch (error) {
    console.error("Token refresh failed:", error);
    accessToken = "";
    currentUserId = null;
    showLogin();
    return false;
  }
}

// --- API HELPER ---
async function apiCall(method, endpoint, data = null, formData = false) {
  try {
    const config = {
      method,
      url: `${API_URL}${endpoint}`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      withCredentials: true,
    };

    if (data) {
      if (formData) {
        config.data = data;
        config.headers["Content-Type"] = "multipart/form-data";
      } else {
        config.data = data;
      }
    }

    return await axios(config);
  } catch (error) {
    // Jika 401, coba refresh token
    if (error.response && error.response.status === 401) {
      const refreshed = await refreshToken();
      if (refreshed) {
        // Coba ulangi request setelah refresh token berhasil
        return await apiCall(method, endpoint, data, formData);
      }
    }
    throw error;
  }
}

// --- SPAREPART MANAGEMENT ---
async function loadSpareparts() {
  try {
    const response = await apiCall("get", "/spareparts");
    const spareparts = response.data;
    const container = document.getElementById("sparepartsList");
    container.innerHTML = "";

    spareparts.forEach((part) => {
      const card = document.createElement("div");
      card.className = "card";

      let imageHtml = "";
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
    const response = await apiCall("get", "/spareparts");
    const spareparts = response.data;
    const container = document.getElementById("availableSpareparts");
    container.innerHTML = "";

    spareparts.forEach((part) => {
      if (part.stock > 0) {
        // Hanya tampilkan yang ada stoknya
        const card = document.createElement("div");
        card.className = "card";

        let imageHtml = "";
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
    const response = await apiCall("get", "/spareparts");
    const sparepart = response.data.find((part) => part.id === id);

    if (!sparepart) {
      alert("Sparepart tidak ditemukan!");
      return;
    }

    // Set form untuk editing
    document.getElementById("sparepartName").value = sparepart.name;
    document.getElementById("sparepartStock").value = sparepart.stock;
    document.getElementById("sparepartPrice").value = sparepart.price;
    document.getElementById("sparepartForm").classList.remove("hidden");

    // Simpan ID untuk nanti
    editingSparepartId = id;
  } catch (error) {
    console.error("Error fetching sparepart for edit:", error);
    alert("Gagal mengambil data sparepart");
  }
}

async function saveSparepart() {
  const name = document.getElementById("sparepartName").value;
  const stock = document.getElementById("sparepartStock").value;
  const price = document.getElementById("sparepartPrice").value;
  const imageInput = document.getElementById("sparepartImage");

  if (!name || !stock || !price) {
    alert("Semua field harus diisi kecuali gambar!");
    return;
  }

  try {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("stock", stock);
    formData.append("price", price);
    formData.append("supplierId", 1); // Default supplier ID

    if (imageInput.files[0]) {
      formData.append("image", imageInput.files[0]);
    }

    if (editingSparepartId) {
      // Update existing sparepart
      await apiCall("put", `/spareparts/${editingSparepartId}`, formData, true);
      alert("Sparepart berhasil diperbarui!");
    } else {
      // Create new sparepart
      await apiCall("post", "/spareparts", formData, true);
      alert("Sparepart berhasil ditambahkan!");
    }

    // Reset form and reload
    document.getElementById("sparepartForm").classList.add("hidden");
    editingSparepartId = null;
    loadSpareparts();
  } catch (error) {
    console.error("Error saving sparepart:", error);
    alert(
      `Gagal menyimpan data: ${error.response?.data?.message || error.message}`
    );
  }
}

async function deleteSparepart(id) {
  if (!confirm("Apakah Anda yakin ingin menghapus sparepart ini?")) {
    return;
  }

  try {
    await apiCall("delete", `/spareparts/${id}`);
    alert("Sparepart berhasil dihapus!");
    loadSpareparts();
  } catch (error) {
    console.error("Error deleting sparepart:", error);
    alert(
      `Gagal menghapus data: ${error.response?.data?.message || error.message}`
    );
  }
}

// --- PEMBELIAN MANAGEMENT ---
async function buySparepart(sparepartId) {
  const qtyInput = document.getElementById(`qty-${sparepartId}`);
  const jumlah = parseInt(qtyInput.value, 10);

  if (!jumlah || jumlah < 1) {
    alert("Jumlah pembelian harus minimal 1!");
    return;
  }

  try {
    const orderData = {
      id_user: currentUserId,
      id_sparepart: sparepartId,
      jumlah: jumlah,
    };

    await apiCall("post", "/pembelian", orderData);
    alert("Pembelian berhasil!");
    loadMyOrders();
    loadAvailableSpareparts(); // Reload untuk mendapatkan stok terbaru
  } catch (error) {
    console.error("Error creating order:", error);
    alert(
      `Gagal melakukan pembelian: ${
        error.response?.data?.message || error.message
      }`
    );
  }
}

async function loadMyOrders() {
  try {
    const response = await apiCall("get", `/pembelian/${currentUserId}`);
    const orders = response.data;
    const container = document.getElementById("myOrders");
    container.innerHTML = "";

    if (orders.length === 0) {
      container.innerHTML = "<p>Belum ada pesanan.</p>";
      return;
    }

    const orderTable = document.createElement("table");
    orderTable.style.width = "100%";
    orderTable.style.borderCollapse = "collapse";
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
    const tableBody = document.getElementById("orderTableBody");

    orders.forEach((order, index) => {
      const total = order.jumlah * order.sparepart.price;
      const row = document.createElement("tr");
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
    document.getElementById("myOrders").innerHTML =
      "<p>Gagal memuat data pesanan.</p>";
  }
}

async function cancelOrder(orderId) {
  if (!confirm("Apakah Anda yakin ingin membatalkan pesanan ini?")) {
    return;
  }

  try {
    await apiCall("delete", `/pembelian/${orderId}`);
    alert("Pesanan berhasil dibatalkan!");
    loadMyOrders();
    loadAvailableSpareparts(); // Reload untuk mendapatkan stok terbaru
  } catch (error) {
    console.error("Error canceling order:", error);
    alert(
      `Gagal membatalkan pesanan: ${
        error.response?.data?.message || error.message
      }`
    );
  }
}

// --- INISIALISASI ---
window.onload = function () {
  // Check jika user sudah login
  refreshToken()
    .then((success) => {
      if (success) {
        // Akan menghandle redirect di refreshToken()
      } else {
        showLogin();
      }
    })
    .catch(() => {
      showLogin();
    });
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
